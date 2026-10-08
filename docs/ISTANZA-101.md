# Istanza propria 101: creare la tua copia di Release Board e tenerla aggiornata

Questa guida è per chi vuole una copia di Release Board tutta sua, pubblica o privata, pubblicata
su GitHub Pages e magari collegata a un progetto Firebase, e vuole portarla alle versioni nuove
senza rompere nulla. Parte da zero: spiega anche i concetti di Git che servono, per chi non li ha
mai usati. Chi li conosce può saltare al capitolo 3.

Il repository pubblico è <https://github.com/stangoldbear/release-board>. Contiene solo versioni
rilasciate, una per tag (`v0.10.0`, `v0.10.1`, …): la punta del suo branch `main` è sempre l'ultima
versione pubblicata.

## 1. I concetti, in breve

**Repository**: la cartella del progetto con tutta la sua storia. Esiste in due posti: su GitHub
(il repository "remoto") e sul tuo computer (la copia "locale", fatta con `git clone`). I due si
scambiano commit con `git push` (dal computer a GitHub) e `git fetch` o `git pull` (da GitHub al
computer).

**Commit**: una fotografia dei file in un dato momento, con un messaggio. La storia del repository
è la sequenza dei commit. Prima di un commit i file cambiati vanno messi "in scena" con `git add`.

**Working tree**: i file reali nella cartella, quelli che apri e modifichi. Git li confronta con
l'ultimo commit: `git status` dice cosa è cambiato e non è ancora stato salvato in un commit.

**Branch**: una linea di sviluppo con un nome. Qui ne basta uno, `main`: è quello che il workflow
pubblica su GitHub Pages.

**Tag**: un'etichetta fissa su un commit. Release Board mette un tag per ogni versione: `v0.10.0`
è il commit esatto della versione 0.10.0, per sempre.

**Remote**: un indirizzo di un repository remoto, con un nome breve. Il clone chiama `origin` il
repository da cui è nato. In questa guida ne userai due:

- `origin`: il **tuo** repository su GitHub, dove fai `push` e da cui parte la pubblicazione;
- `upstream`: il repository pubblico di Release Board, da cui **prendi** le versioni nuove. Il
  nome è una convenzione ("a monte"): è la sorgente da cui scorre il codice verso la tua copia.

**`git fetch upstream --tags`**: scarica dal remoto `upstream` i commit e i tag nuovi e li mette
da parte, **senza toccare i tuoi file**. È l'operazione sicura per eccellenza: dopo un fetch puoi
guardare cosa è arrivato (`git log`, `git diff`) e decidere con calma.

**`git merge v0.10.1`**: applica alla tua linea i commit che portano a quel tag. Se non hai
modifiche tue, Git "avanza" semplicemente `main` fino al tag (un _fast-forward_). Se ne hai, crea
un commit di unione; se tu e la versione nuova avete toccato le stesse righe, Git si ferma e ti
chiede di scegliere (un _conflitto_, vedi il capitolo 8).

**`git pull`** è `fetch` + `merge` in un comando solo. La guida li tiene separati per farti vedere
cosa succede.

**`.gitignore`**: l'elenco dei file che Git non versiona mai: dipendenze installate
(`node_modules`), build (`dist`), file con valori locali (`.env.local`). Esistono solo sul tuo
computer e nessun aggiornamento li tocca.

**Variabili del repository**: valori che GitHub tiene nelle impostazioni del repository
(**Settings → Secrets and variables → Actions → Variables**) e passa ai workflow. Release Board ci
mette la configurazione dell'istanza: così il codice resta uguale per tutti e la tua
configurazione non sta in nessun file.

**HTTPS e SSH**: Git parla con GitHub in due modi. Con un indirizzo `https://github.com/…` usa
la porta 443, la stessa del browser, e si autentica con un token; con un indirizzo
`git@github.com:…` usa SSH sulla porta 22 e si autentica con una chiave. Funzionano uguale; la
differenza conta sulle reti aziendali, che spesso chiudono la 22 e lasciano aperta la 443. Questa
guida usa HTTPS; il capitolo 3a dice come passare a SSH se lo preferisci.

**Workflow**: un'automazione di GitHub Actions. `deploy-pages.yml` compila il sito e lo pubblica su
GitHub Pages a ogni push su `main`; `ci.yml` controlla formattazione, lint, tipi, test e regole.

## 2. Cosa è tuo e cosa è di Release Board

Questa è la distinzione che rende gli aggiornamenti tranquilli. Il repository pubblico contiene
**solo codice uguale per tutte le istanze**: non ci sono file da adattare. Tutto ciò che è tuo sta
fuori dai file o in file che il repository pubblico non ha:

| Cosa                                                              | Dove sta                                         | Un aggiornamento lo tocca? |
| ----------------------------------------------------------------- | ------------------------------------------------ | -------------------------- |
| I dati del piano (attività, note, progetti…)                      | Nel browser (modalità locale) o in Firestore     | No                         |
| La configurazione del sito (`PAGES_DEPLOY`, `VITE_FIREBASE_*`)    | Variabili del repository su GitHub               | No                         |
| Le impostazioni di GitHub Pages, i collaboratori, la visibilità   | Impostazioni del repository su GitHub            | No                         |
| Il progetto Firebase (provider, dominio, regole pubblicate, dati) | Console Firebase                                 | No                         |
| `.env.local`, `node_modules`, `dist`, cache dell'editor           | Solo sul tuo computer, ignorati da Git           | No                         |
| Il codice, i workflow, `firestore/firestore.rules`, `README.md`   | I file versionati, uguali al repository pubblico | Sì, è il loro scopo        |

Due conseguenze pratiche:

- un aggiornamento sostituisce i file versionati e basta: niente da "ricopiare a mano" dopo;
- `firestore/firestore.rules` arriva aggiornato con i file, ma le regole **in vigore** sono quelle
  pubblicate nella console Firebase. Quando il CHANGELOG di una versione dice che le regole sono
  cambiate, ripubblicale (Impostazioni → Istanza condivisa nel sito spiega dove).

Se un giorno la tua istanza avrà un file tutto suo (per esempio `public/CNAME` per un dominio
proprio), dillo allo script di aggiornamento con `.update-ignore` (capitolo 5) e tienilo a mente
negli aggiornamenti con Git: è l'unico caso in cui un merge potrebbe proporti di cambiarlo.

## 3. Creare l'istanza: due modi

### 3a. Clone del repository pubblico (consigliato)

Il tuo repository nasce con la stessa storia di quello pubblico. È la base che rende ogni
aggiornamento un `fetch` e un `merge`, con Git che fa il lavoro di confronto per te.

Perché non un fork: un fork di un repository pubblico resta pubblico, GitHub non permette di
renderlo privato. Per un'istanza privata il modo giusto è questo clone spinto su un repository
tuo.

1. Su GitHub crea un repository **vuoto** (senza README, senza `.gitignore`, senza licenza):
   **New repository**, scegli nome e visibilità, premi **Create repository**. Prendi nota
   dell'indirizzo HTTPS, per esempio `https://github.com/tuo-utente/release-board-azienda.git`:
   il pulsante **Code** lo mostra.

2. Sul tuo computer, in un terminale:

   ```sh
   git clone https://github.com/stangoldbear/release-board.git release-board-azienda
   cd release-board-azienda
   git remote rename origin upstream
   git remote add origin https://github.com/tuo-utente/release-board-azienda.git
   git push -u origin main
   git push origin --tags
   ```

   Riga per riga: scarichi il repository pubblico in una cartella nuova; entri; rinomini il remoto
   da cui è nato in `upstream`, perché d'ora in poi è la sorgente degli aggiornamenti; aggiungi il
   tuo repository come `origin`; spingi `main` su GitHub, e `-u` ricorda che `main` locale segue
   `origin/main`; spingi anche i tag, così le versioni si vedono anche nel tuo repository.

   Al primo `push` Git chiede le credenziali. Username è il tuo utente GitHub; Password **non** è
   la password dell'account, che GitHub non accetta da Git, ma un token: lo crei in GitHub →
   **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new
   token**, con un nome, una scadenza, **Repository access → Only select repositories** con il
   repository dell'istanza e, in **Repository permissions**, **Contents: Read and write**.
   Incollalo al posto della password: su macOS il portachiavi lo ricorda, su Windows lo fa Git
   Credential Manager. In alternativa GitHub CLI fa tutto da sé: `gh auth login`, poi GitHub.com,
   HTTPS e accesso dal browser (`brew install gh` su macOS).

3. Su GitHub, nel tuo repository: scheda **Actions**, abilita i workflow se te lo chiede; poi
   **Settings → Pages**, alla voce **Source** scegli **GitHub Actions**.

4. Se il repository è privato: **Settings → Secrets and variables → Actions → Variables**,
   **New repository variable**, nome `PAGES_DEPLOY`, valore `true`. Un repository privato pubblica
   solo se il suo piano include GitHub Pages.

5. Fai un push qualsiasi, o apri **Actions → Deploy Pages → Run workflow**: in qualche minuto il
   sito è online all'indirizzo che **Settings → Pages** mostra. In fondo alla pagina vedi versione e
   commit della build: è il modo per sapere sempre a che versione è l'istanza.

6. Per il piano condiviso con Firebase segui la guida dentro il sito, "Configura la tua istanza",
   che ti porta passo per passo nelle console; le quattro variabili `VITE_FIREBASE_*` si mettono
   nello stesso posto di `PAGES_DEPLOY`.

Controllo finale: `git remote -v` deve mostrare `origin` con il tuo indirizzo e `upstream` con
quello pubblico, due righe ciascuno (fetch e push).

#### Se preferisci SSH

Con SSH non servono token: una chiave sul computer e la sua parte pubblica nel tuo account.

```sh
ssh-keygen -t ed25519 -C "il-mio-computer"   # Invio a tutte le domande
cat ~/.ssh/id_ed25519.pub                     # la chiave pubblica, da copiare tutta
```

Incollala in GitHub → **Settings → SSH and GPG keys → New SSH key**. Poi `ssh -T git@github.com`
deve rispondere «Hi tuo-utente!». Se invece resta appeso e finisce in «Operation timed out», la
rete chiude la porta 22: GitHub risponde anche sulla 443, basta dirlo a SSH nel file
`~/.ssh/config` (crealo se manca):

```
Host github.com
  HostName ssh.github.com
  Port 443
  User git
```

Riprova `ssh -T git@github.com`; quando risponde, dai a `origin` l'indirizzo SSH:

```sh
git remote set-url origin git@github.com:tuo-utente/release-board-azienda.git
```

`upstream` può restare HTTPS: da lì si legge soltanto, e la porta 443 è aperta ovunque.

### 3b. Copia dei file (funziona, ma è sconsigliata)

È il "download ZIP" dalla pagina del repository pubblico (**Code → Download ZIP**), oppure un
copia e incolla dei file in una cartella nuova, poi `git init`, un commit e un push su un
repository tuo. Il sito funziona identico.

Lo svantaggio arriva al primo aggiornamento: il tuo repository non condivide nessun commit con
quello pubblico, quindi Git non sa cosa è cambiato tra la tua copia e la versione nuova. Ogni
aggiornamento diventa un "ricopia tutto", a mano o con lo script del capitolo 5, e le tue
eventuali modifiche al codice vanno riportate a mano. Se hai già una copia così, il capitolo 6
spiega come trasformarla in un clone, senza perdere niente.

## 4. Aggiornare un'istanza nata come clone

Ogni volta che esce una versione (la pagina **Releases** del repository pubblico, o il CHANGELOG):

```sh
cd release-board-azienda
git status                      # deve dire che non ci sono modifiche in sospeso
git fetch upstream --tags       # scarica la versione nuova, senza toccare i file
git log --oneline main..v0.10.1 # (facoltativo) i commit che arriveranno
git merge v0.10.1               # applica la versione; con modifiche tue, risolvi i conflitti
npm ci                          # reinstalla le dipendenze come le fissa package-lock.json
npm run dev                     # (facoltativo) prova in locale su http://localhost:3000
git push origin main            # pubblica: il workflow Deploy Pages riparte da solo
```

Note:

- Se non hai mai modificato il codice, `git merge` fa un fast-forward e non crea commit nuovi;
  puoi scriverlo come `git merge --ff-only v0.10.1`, che si rifiuta di fare altro.
- `git pull upstream main` fa lo stesso di fetch + merge, prendendo la punta di `main` pubblico,
  che è sempre l'ultima versione. Il tag è più esplicito e lo trovi nel CHANGELOG.
- Dopo il push, controlla in **Actions** che "Deploy Pages" sia verde e, nel sito, che in fondo
  compaia la versione nuova.
- Se il CHANGELOG della versione dice che le regole di Firestore sono cambiate, ripubblica
  `firestore/firestore.rules` nella console Firebase: finché non lo fai, il sito dice quali parti
  non sono disponibili nell'indicatore di sincronizzazione.

## 5. Aggiornare un'istanza nata come copia: lo script

Dalla versione 0.10.1 il repository contiene `scripts/update-from-release.sh`, che fa il "ricopia
tutto" nel modo giusto:

1. si rifiuta di partire se ci sono modifiche non ancora in un commit, così l'aggiornamento resta
   un cambiamento a sé, che `git diff` mostra per intero e `git checkout .` annulla;
2. scarica la versione chiesta (o l'ultima) dal repository pubblico in una cartella temporanea;
3. specchia i file sulla tua cartella: i file della versione vengono copiati sopra i tuoi, i file
   versionati che la versione non ha più vengono tolti (un file vecchio lasciato lì farebbe
   fallire lint e controllo dei tipi);
4. lascia stare ciò che è tuo: `.git`, `node_modules`, `dist`, `.env*`, `.firebase`, `.vite`, le
   cartelle dell'editor, `*.tsbuildinfo` e tutto ciò che elenchi in `.update-ignore`;
5. non fa commit: ti mostra il riepilogo e i passi successivi.

Uso, dalla cartella della tua copia:

```sh
scripts/update-from-release.sh --dry-run   # elenca cosa cambierebbe, senza scrivere nulla
scripts/update-from-release.sh             # aggiorna all'ultima versione pubblicata
scripts/update-from-release.sh v0.10.1     # aggiorna a una versione precisa
```

Poi:

```sh
npm ci
git add -A
git commit -m "chore: aggiorna alla v0.10.1"
git push
```

La prima volta lo script non c'è ancora nella tua copia: prendilo dal repository pubblico (è in
`scripts/`), mettilo nella stessa posizione, fai un commit e poi lancialo.

Serve solo `git`: su macOS e Linux nel terminale, su Windows in Git Bash.

`.update-ignore` è un file facoltativo alla radice del repository, con un pattern per riga: un
percorso dalla radice, che vale anche per tutto ciò che sta sotto, con `*` come jolly (le righe
che iniziano con `#` sono commenti). Esempio:

```
# File di questa istanza, da non sovrascrivere mai
public/CNAME
```

## 6. Trasformare una copia in un clone

Se la tua istanza è nata come copia (3b) e vuoi passare agli aggiornamenti con Git (4), puoi
ricollegare la storia senza rifare nulla su GitHub: il repository resta lo stesso, con le sue
variabili, le impostazioni di Pages e i collaboratori. I dati non c'entrano: stanno nel browser o
in Firestore.

```sh
cd la-tua-copia
git status                                  # niente in sospeso
git branch backup-copia                     # la storia di prima resta raggiungibile da qui
git remote add upstream https://github.com/stangoldbear/release-board.git
git fetch upstream --tags
git checkout -B main v0.10.1                # main diventa esattamente la versione pubblicata
npm ci
git push --force-with-lease origin main     # riscrive main su GitHub con la storia nuova
git push origin --tags
```

`git checkout -B main v0.10.1` sposta `main` sul commit del tag: i file diventano quelli della
versione e la storia diventa quella del repository pubblico. Il push con `--force-with-lease`
serve perché la storia nuova non continua la vecchia; è l'unico momento in cui un comando
"forzato" è giusto, e il branch `backup-copia` conserva com'era prima (cancellalo quando sei
sicuro: `git branch -D backup-copia`). Se avevi modificato il codice, riportale dopo con
`git diff backup-copia -- percorso/del/file` come riferimento.

Da qui in poi vale il capitolo 4.

## 7. Dopo ogni aggiornamento

- `npm ci`, sempre: `package-lock.json` fissa le versioni esatte delle dipendenze.
- Le voci del CHANGELOG tra la versione di prima e quella nuova: regole di Firestore da
  ripubblicare, variabili nuove, cose da fare nelle Impostazioni (per esempio un campo
  predefinito da aggiungere).
- Un giro nel sito pubblicato: la versione in fondo alla pagina, l'indicatore di sincronizzazione
  senza avvisi, le funzioni nuove.

## 8. Problemi comuni

**`git merge` dice "CONFLICT"**: tu e la versione nuova avete cambiato le stesse righe. `git status`
elenca i file; dentro, Git segna le due versioni tra `<<<<<<<`, `=======` e `>>>>>>>`. Scegli,
togli i segni, poi `git add` dei file e `git commit`. Per annullare tutto e tornare a prima del
merge: `git merge --abort`.

**`git push` resta appeso e finisce in «Operation timed out»**: `origin` ha un indirizzo SSH
(`git@github.com:…`) e la rete chiude la porta 22, come molte reti aziendali. Prova
`ssh -T git@github.com`: se va in timeout è questo. O passi `origin` a HTTPS
(`git remote set-url origin https://github.com/tuo-utente/nome.git`: il push chiede utente e
token, capitolo 3a), o fai passare SSH dalla porta 443 (capitolo 3a, «Se preferisci SSH»).

**«Permission denied (publickey)»**: la porta è aperta, ma GitHub non conosce la chiave di questo
computer. Registra la chiave pubblica (capitolo 3a, «Se preferisci SSH») o passa a HTTPS.

**«Authentication failed», o «Support for password authentication was removed», con HTTPS**: hai
messo la password dell'account; serve un token (capitolo 3a). Se il portachiavi ha memorizzato
una credenziale sbagliata, su macOS cancella la voce `github.com` in Accesso Portachiavi, oppure
lancia `gh auth login`.

**`git push` rifiutato ("rejected")**: su GitHub ci sono commit che in locale non hai, per esempio
di un collega. `git pull origin main`, poi di nuovo `git push`.

**"Ci sono modifiche non ancora salvate"** dallo script, o `git status` non pulito: fai un commit
(`git add -A && git commit -m "…"`) o scarta le modifiche (`git checkout .` per i file versionati,
`git clean -n` per vedere quelli nuovi e `git clean -f` per toglierli).

**La versione non esiste**: i tag sono `vX.Y.Z` con la `v`; `git ls-remote --tags upstream` li
elenca.

**Il sito non si aggiorna dopo il push**: scheda **Actions**, workflow "Deploy Pages". Se non è
partito, controlla che i workflow siano abilitati e, in un repository privato, che `PAGES_DEPLOY`
valga `true`. Se è rosso, il log dice quale passo è fallito.

**Nel sito mancano i progetti, le note libere o i dettagli dei progetti** dopo un aggiornamento:
le regole pubblicate in Firebase sono quelle vecchie. Ripubblica `firestore/firestore.rules`.

## 9. Glossario minimo

- **chiave SSH**: una coppia di file; la parte pubblica si registra su GitHub, la privata resta
  sul computer e firma gli accessi.
- **clone**: copia locale di un repository, con tutta la storia.
- **commit**: fotografia dei file con un messaggio; l'unità della storia.
- **fast-forward**: un merge che non crea commit perché basta avanzare il branch.
- **fetch**: scarica commit e tag da un remoto senza toccare i file.
- **merge**: unisce nella tua linea i commit di un'altra (un tag, un branch).
- **origin**: il remoto da cui nasce un clone; qui, il tuo repository.
- **push**: manda i tuoi commit a un remoto.
- **remote**: indirizzo di un repository altrove, con un nome breve.
- **tag**: etichetta fissa su un commit; qui, una versione.
- **token**: una password a scadenza creata su GitHub, con cui Git si autentica via HTTPS.
- **upstream**: per convenzione, il remoto da cui arrivano gli aggiornamenti; qui, il repository
  pubblico di Release Board.
- **working tree**: i file reali nella cartella.
