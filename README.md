# Release Board

Calendario Gantt per pianificare rilasci e attività su corsie parallele, con note e valori
giornalieri.

**Demo:** <https://stangoldbear.github.io/release-board/>

## Funzionalità

- Vista mensile a colonne giornaliere e vista settimanale.
- Attività su corsie, da trascinare e ridimensionare, con stato, colore, assegnatario e checklist.
- Note e valori giornalieri, per esempio il fatturato, allineati ai giorni del calendario.
- Festività italiane e weekend evidenziati.
- Backup e ripristino in un file JSON dalle Impostazioni.

In questa versione i dati restano nel browser che li ha creati. Per spostarli altrove usa
Impostazioni → Backup.

## Pubblicare la tua copia

1. Fai un fork del repository e abilita i workflow nella scheda **Actions**.
2. In **Settings → Pages** scegli **GitHub Actions** come sorgente.
3. Il workflow **Deploy Pages** pubblica il sito a ogni push su `main`.

Un repository privato pubblica solo se il suo piano include GitHub Pages e se la variabile di
repository `PAGES_DEPLOY` vale `true`.

## Sviluppo

Serve Node.js 22.12 o successivo; la versione di riferimento è in `.nvmrc`.

```sh
npm ci
npm run dev      # http://localhost:3000
npm run check    # formattazione, lint, tipi, test e build
```

## Sicurezza della supply chain

- `package-lock.json` è versionato e l'installazione usa sempre `npm ci`.
- `.npmrc` disattiva gli script di installazione dei pacchetti e, da npm 11.10, ignora le versioni
  pubblicate da meno di 7 giorni.
- Le dipendenze sono poche e fissate a versioni esatte. Le GitHub Actions sono fissate al commit.

Per segnalare una vulnerabilità leggi [SECURITY.md](SECURITY.md).

## Licenza

[MIT](LICENSE)
