# Release Board

Calendario Gantt per pianificare rilasci e attività su corsie parallele, con note e valori
giornalieri.

**Demo:** <https://stangoldbear.github.io/release-board/>

## Funzionalità

- Le note libere in cima e una sola timeline per i rilasci e i progetti, sugli stessi giorni: il
  fatturato e le note sulla timeline, poi le corsie delle attività con sotto le note dei giorni
  (Next Releases), i progetti (Roadmap) e il lavoro di ogni persona (Persone), ognuno sotto
  un'intestazione con i conteggi che si ripiega. Con le schede in fondo alla pagina «All» mostra
  tutto, «Next Releases», «Roadmap» e «Persone» la timeline con una parte sola; oppure, a scelta nelle Impostazioni, i pulsanti nell'intestazione
  mostrano e nascondono le parti. Un solo pulsante «Nuovo» per attività, progetti e note.
- La timeline scorre dentro la finestra, con mesi, fatturato e giorni sempre in alto e i nomi
  sempre a sinistra, in una colonna larga quanto si vuole; quattro livelli di zoom («Dettaglio»,
  «Mese», «2 mesi», «Trimestre») più «Mostra N giorni», che riempie la finestra con quanti giorni
  interi si vogliono, i giorni passati in grigio o nascosti, la colonna di oggi segnata, e bacheca
  settimanale delle attività. Tre livelli di dettaglio per tutte le righe: «Solo titoli», con i
  titoli interi su una riga, «Info principali» e «Team». I comandi stanno in alto, con un
  suggerimento al passaggio, e «?» apre l'aiuto con gesti, tasti e legenda.
- Testo di note e calendari regolabile con le lenti, dal 75% al 175%, e tre densità: «Large»,
  «Standard», che mostra più testo in ogni casella, e «Compatta», che stringe anche le barre delle
  persone dei progetti.
- Attività da trascinare e ridimensionare, anche da tastiera, con stato, assegnatario e
  checklist, nel colore della loro corsia: le corsie, con i loro colori, si scelgono nelle
  Impostazioni.
- «Dividi…» nel menu delle barre spezza il lavoro di una persona, la contingency o un'attività in
  più parti, con una pausa tra l'una e l'altra, da un'anteprima con i tagli da trascinare.
- Note e valori giornalieri, per esempio il fatturato, allineati ai giorni del calendario. Le note
  si spostano trascinandole su un altro giorno, anche da tastiera, e «Espandi» ne mostra il testo
  intero.
- Note libere sotto la ricerca, come una bacheca senza vuoti: titolo, testo, colore, un
  promemoria che compare il giorno scelto, «In evidenza» per tenerle nella prima riga e un ordine
  che si cambia trascinandole. In un'istanza condivisa ognuno vede le sue, può guardare quelle di
  tutti, raggruppate per autore, e può tenerne alcune private.
- I testi lunghi (note, descrizioni, campi «Testo lungo») si scrivono anche in Markdown, con
  l'anteprima, e si leggono con titoli, elenchi, caselle, grassetto e link.
- Roadmap: i progetti passati, in corso e futuri, una riga ciascuno con il titolo, lo stato come
  forma, i team al lavoro e l'etichetta della dimensione; tutto il resto, periodo, giorni uomo,
  responsabile, deadline, descrizione, campi personalizzati (link a Jira, Figma e Confluence,
  stime…) e persone con i giorni, in una finestra spostabile che si apre dal pulsante «i» della
  riga. Un clic su un giorno dice in fondo alla pagina i giorni uomo di ogni team in quel giorno.
  Lo stato segue la data di oggi: un progetto pianificato di cui arriva il giorno è in corso, uno
  di cui passa la fine è completato, e un triangolo sulla colonna di oggi chiede di confermare. La
  barra di un progetto prende il colore della sua dimensione, o un colore libero a scelta nelle
  Impostazioni, e i progetti si raggruppano per un campo e si ordinano a mano o per inizio, fine,
  deadline, stato o titolo. Etichette colorate, quante ne servono a ogni progetto, si danno nella
  sua finestra e si leggono nelle sue informazioni; il menu «Etichette» mostra solo i progetti con
  quelle scelte. Ogni progetto ha il suo team: le persone con i giorni uomo in una tabella che le formule
  dei team (analisi, test, contingency) riempiono da sole, disposte nel Gantt in parallelo o in
  sequenza: un progetto dura quanto il lavoro del suo team, con una deadline segnata dove il lavoro la supera e
  un avviso qualche giorno prima; la barra mostra il lavoro come lane per persona, come fasi o da
  sola, e le note sulla timeline sono rombi su un giorno, di un progetto o liberi. Note con autore,
  scadenza e avviso; una vista Team con una barra per persona, che salta weekend, festività,
  chiusure aziendali e assenze, allungabile dal bordo o scrivendo i giorni con un doppio clic. Progetti, barre e note si
  spostano trascinandoli, anche da tastiera.
- Persone: una riga per persona, divise per team, con una barra per ogni progetto nel colore del
  progetto. I giorni in cui una persona ha più progetti insieme sono segnati in rosso, con il
  numero accanto al nome; una barra si sposta nel tempo o, trascinata su un'altra persona (anche
  con Alt + frecce), le passa il lavoro, e progetti e giorni uomo seguono subito.
- Contatti (funzione beta, da attivare nelle Impostazioni): l'organigramma dell'azienda costruito
  a mano, come schema o come elenco, con le note su ogni persona.
- Ricerca in attività, note dei giorni, note libere, progetti (anche note e campi), note sulla
  timeline e contatti, con tutte le parole o almeno una: le parole trovate sono evidenziate e i risultati si
  scorrono uno alla volta.
- Date per esteso nel formato scelto nelle Impostazioni, `gg-mm-aa` di serie.
- Fatturato previsto importato da un foglio Google in CSV, con il semaforo dei rilasci e le
  promozioni di ogni giorno.
- Festività italiane e weekend evidenziati; chiusure aziendali a righine rosse, che per il lavoro
  dei progetti valgono come un weekend.
- Team e persone nelle Impostazioni: ordine dei team (quello della tabella dei giorni di ogni
  progetto) da trascinare, colori, formule dei giorni con esempi da copiare.
- Tema chiaro e scuro, quello del dispositivo, oppure uno dei 32 temi ispirati ai temi più usati
  di Visual Studio Code, tutti con il contrasto WCAG AA; sopra il tema, i colori di attività,
  progetti e team in quattro preset: Pastello (di serie), Morbido, Regolare e Solarized.
- Backup e ripristino in un file JSON dalle Impostazioni, e un file a parte con le sole
  impostazioni (configurazione della roadmap, chiusure, aspetto) da esportare e reimportare.
- Con un progetto Firebase: piano condiviso con il team in tempo reale, con l'ora dell'ultima
  sincronizzazione; accesso con GitHub, membri invitati per username, domini email ammessi a
  scelta del proprietario, un proprietario si toglie solo scrivendo il suo username; cronologia di
  ogni modifica, cancellazioni comprese, in una pagina con grafici e filtri, da cui ognuno annulla
  e ripete le proprie modifiche una alla volta. Il browser non tiene nulla sul disco: l'accesso
  dura quanto la scheda.

Senza progetto Firebase i dati restano nel browser che li ha creati. Per spostarli altrove usa
Impostazioni → Dati → Backup.

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
un'istanza privata non fare un fork, ma un clone. Il sito Pages di un repository privato può anche
essere pubblico, perché i colleghi lo aprano senza accesso al repository: la guida, al capitolo
3c, dice cosa cambia e in che ordine fare i passi.

Il workflow pubblica solo da un commit che supera il controllo delle dipendenze (`npm audit`),
lint, tipi e test. Un sito con un progetto Firebase chiede ai motori di ricerca di non
indicizzarlo.

## Istanza condivisa con Firebase

Il sito pubblicato spiega da solo come fare, passo per passo, nella schermata "Configura la tua
istanza" e in Impostazioni → Dati → Istanza condivisa. Ogni passo dice se si fa nella console Firebase,
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

Chi fa il primo accesso crea il piano e ne è proprietario: fallo subito dopo la pubblicazione,
prima di condividere il link. Poi nessun altro può creare piani nel progetto. Il proprietario
invita gli altri per username GitHub, ed è il solo a ripristinare un backup. I dati stanno nel progetto
Firebase dell'installazione, e in nessun altro posto.

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
- La CI e la pubblicazione falliscono con un avviso di sicurezza di gravità alta o critica
  (`npm audit --audit-level=high`); la CI gira anche una volta a settimana.

Per segnalare una vulnerabilità leggi [SECURITY.md](SECURITY.md).

## Licenza

[MIT](LICENSE)
