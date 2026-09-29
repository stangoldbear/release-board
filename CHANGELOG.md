# Changelog

Le modifiche rilevanti di ogni versione. Il formato segue
[Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/) e le versioni seguono il
[versionamento semantico](https://semver.org/lang/it/).

## [Unreleased]

## [0.1.1] - 2026-09-28

Correzioni per l'uso da telefono.

### Corretto

- Sul telefono le finestre (attività, valori giornalieri, note, impostazioni, conferme) restano
  dentro lo schermo: titolo e pulsanti sono sempre visibili e scorre solo il contenuto.
- Con una finestra aperta la pagina sotto resta ferma, invece di scorrere al posto della finestra.
- Sul telefono, toccare un campo non ingrandisce più la pagina.
- Sugli schermi stretti l'intestazione va a capo invece di rendere la pagina più larga dello schermo.
- Trascinare una selezione di testo fuori da un campo non chiude più la finestra.

### Modificato

- Tutte le finestre si chiudono con Esc o con un clic fuori, e alla chiusura il focus torna al
  pulsante che le ha aperte.

## [0.1.0] - 2026-09-28

Prima versione pubblica. I dati restano nel browser che li ha creati.

### Aggiunto

- Calendario mensile a colonne giornaliere e vista settimanale, con corsie di attività.
- Attività da trascinare e ridimensionare, con stato, colore, bordo, assegnatario, note e checklist.
- Note e valori giornalieri sotto il calendario.
- Festività italiane e weekend evidenziati.
- Impostazioni con backup e ripristino in JSON e informazioni sulla versione.
- Dati di esempio per provare l'app partendo da un piano vuoto.

[Unreleased]: https://github.com/stangoldbear/release-board/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/stangoldbear/release-board/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/stangoldbear/release-board/releases/tag/v0.1.0
