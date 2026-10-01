# Release Board

Calendario Gantt per pianificare rilasci e attività su corsie parallele, con note e valori
giornalieri.

**Demo:** <https://stangoldbear.github.io/release-board/>

## Funzionalità

- Calendario a corsie con tre livelli di zoom (due settimane, mese, trimestre) e bacheca
  settimanale.
- Attività da trascinare e ridimensionare, anche da tastiera, con stato, colore, assegnatario e
  checklist.
- Note e valori giornalieri, per esempio il fatturato, allineati ai giorni del calendario.
- Festività italiane e weekend evidenziati.
- Tema chiaro e scuro, oppure quello del dispositivo.
- Backup e ripristino in un file JSON dalle Impostazioni.
- Con un progetto Firebase: piano condiviso con il team in tempo reale, anche offline, accesso con
  GitHub, membri invitati per username, cronologia delle modifiche.

Senza progetto Firebase i dati restano nel browser che li ha creati. Per spostarli altrove usa
Impostazioni → Backup.

## Pubblicare la tua copia

1. Fai un fork del repository e abilita i workflow nella scheda **Actions**.
2. In **Settings → Pages** scegli **GitHub Actions** come sorgente.
3. Il workflow **Deploy Pages** pubblica il sito a ogni push su `main`.

Un repository privato pubblica solo se il suo piano include GitHub Pages e se la variabile di
repository `PAGES_DEPLOY` vale `true`.

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
