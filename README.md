# Release Board

Calendario Gantt per pianificare rilasci e attività su corsie parallele, con note e valori
giornalieri.

**Demo:** <https://stangoldbear.github.io/release-board/>

## Funzionalità

- Due aree, Note e Next Releases, da mostrare o nascondere dall'intestazione; una terza, Roadmap,
  in beta: compare attivando «Funzioni beta» nelle Impostazioni.
- Calendario continuo a corsie, con i mesi uno dopo l'altro, quattro livelli di zoom («Dettaglio»,
  «Mese», «2 mesi», «Trimestre») più «Mostra N giorni», che riempie la finestra con quanti giorni
  interi si vogliono, i giorni passati in grigio o nascosti, e bacheca settimanale. A scelta,
  titoli interi su una riga che escono dalle loro barre, alte una riga.
- Testo di note e calendari regolabile con le lenti, dal 75% al 175%, e vista compatta che mostra
  più testo in ogni casella.
- Attività da trascinare e ridimensionare, anche da tastiera, con stato, colore, assegnatario e
  checklist.
- Note e valori giornalieri, per esempio il fatturato, allineati ai giorni del calendario. Le note
  si spostano trascinandole su un altro giorno, anche da tastiera.
- Note libere sotto la ricerca, una dopo l'altra: titolo, testo, colore, un promemoria che compare
  il giorno scelto e un ordine che si cambia trascinandole. In un'istanza condivisa ognuno vede le
  sue, può guardare quelle di tutti, raggruppate per autore, e può tenerne alcune private.
- Roadmap (funzione beta): i progetti passati, in corso e futuri su una linea del tempo con le
  scale del calendario, con stato, responsabile, descrizione e campi personalizzati (link a Jira,
  Figma e Confluence, team impattati, stime…), i cui valori compaiono come etichette colorate; i
  progetti si raggruppano a scelta per un campo, come la dimensione, che colora anche una barra
  accanto al nome di ogni progetto. Note con autore, scadenza e
  avviso; una vista Team con una barra per persona, che salta weekend, festività e assenze.
  Progetti e barre si spostano trascinandoli, anche da tastiera.
- Ricerca in attività, note dei giorni, note libere e, con le funzioni beta, progetti (anche note
  e campi), con tutte le parole o almeno una: le parole trovate sono evidenziate e i risultati si
  scorrono uno alla volta.
- Fatturato previsto importato da un foglio Google in CSV, con il semaforo dei rilasci e le
  promozioni di ogni giorno.
- Festività italiane e weekend evidenziati.
- Tema chiaro e scuro, quello del dispositivo, oppure uno dei 32 temi ispirati ai temi più usati
  di Visual Studio Code, tutti con il contrasto WCAG AA.
- Backup e ripristino in un file JSON dalle Impostazioni.
- Con un progetto Firebase: piano condiviso con il team in tempo reale, anche offline, con l'ora
  dell'ultima sincronizzazione; accesso con GitHub, membri invitati per username, un proprietario
  si toglie solo scrivendo il suo username; cronologia delle modifiche in una pagina con grafici e
  filtri.

Senza progetto Firebase i dati restano nel browser che li ha creati. Per spostarli altrove usa
Impostazioni → Backup.

## Pubblicare la tua copia

Per un'istanza tua, pubblica o privata, serve un repository GitHub con questo codice. Il modo
consigliato è un clone del repository pubblico spinto su un repository tuo: la guida
[`docs/ISTANZA-101.md`](docs/ISTANZA-101.md) spiega da zero cosa sono clone, remote e tag, come
creare il repository e come portarlo a ogni versione nuova (`git fetch upstream --tags` e un
merge; per una copia nata da un incolla c'è lo script `scripts/update-from-release.sh`).

1. Crea il repository come dice la guida e abilita i workflow nella scheda **Actions**.
2. In **Settings → Pages** scegli **GitHub Actions** come sorgente.
3. Il workflow **Deploy Pages** pubblica il sito a ogni push su `main`.

Un repository privato pubblica solo se il suo piano include GitHub Pages e se la variabile di
repository `PAGES_DEPLOY` vale `true`. Un fork di un repository pubblico resta pubblico: per
un'istanza privata non fare un fork, ma un clone.

## Istanza condivisa con Firebase

Il sito pubblicato spiega da solo come fare, passo per passo, nella schermata "Configura la tua
istanza" e in Impostazioni → Istanza condivisa. Ogni passo dice se si fa nella console Firebase,
nella console Google Cloud o su GitHub. La guida ha due percorsi:

- **Progetto nuovo**, la strada più semplice: un progetto Firebase sul piano gratuito, solo per
  Release Board.
- **Progetto esistente**, anche se lo usano altre app: il suo database `(default)` deve essere
  libero (vuoto, oppure da creare; se è in modalità Datastore si converte) e l'app usa una chiave
  API dedicata, limitata al dominio del sito e alle API che le servono. Le altre app non cambiano.

In entrambi i casi servono il provider GitHub in Authentication con un'app OAuth GitHub, il dominio
del sito tra quelli autorizzati, le regole di `firestore/firestore.rules` pubblicate e quattro
variabili di repository lette al momento della build: `VITE_FIREBASE_API_KEY`,
`VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`. Sono
identificativi pubblici: la protezione dei dati sono le regole.

Chi fa il primo accesso crea il piano e ne è proprietario; invita gli altri per username GitHub. I
dati stanno nel progetto Firebase dell'installazione, e in nessun altro posto.

## Sviluppo

Serve Node.js 22.12 o successivo; la versione di riferimento è in `.nvmrc`.

```sh
npm ci
npm run dev         # http://localhost:3000
npm run check       # formattazione, lint, tipi, test e build
npm run test:rules  # regole e adattatori Firestore sull'emulatore (serve Java 21)
```

Per sviluppare la parte condivisa senza un progetto reale, un file `.env.local` con
`VITE_FIREBASE_EMULATORS=true` e quattro valori qualsiasi (`VITE_FIREBASE_PROJECT_ID` che inizi
con `demo-`) fa parlare l'app con gli emulatori Auth e Firestore della Firebase CLI.

## Sicurezza della supply chain

- `package-lock.json` è versionato e l'installazione usa sempre `npm ci`.
- `.npmrc` disattiva gli script di installazione dei pacchetti e, da npm 11.10, ignora le versioni
  pubblicate da meno di 7 giorni.
- Le dipendenze sono poche e fissate a versioni esatte. Le GitHub Actions sono fissate al commit.

Per segnalare una vulnerabilità leggi [SECURITY.md](SECURITY.md).

## Licenza

[MIT](LICENSE)
