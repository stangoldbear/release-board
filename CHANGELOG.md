# Changelog

Le modifiche rilevanti di ogni versione. Il formato segue
[Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/) e le versioni seguono il
[versionamento semantico](https://semver.org/lang/it/).

## [Unreleased]

## [0.2.0] - 2026-09-29

Istanza condivisa con il team su Firebase, nuova architettura e nuova interfaccia.

### Aggiunto

- Istanza condivisa su Firebase: con un progetto Firestore configurato il piano è unico per il team,
  aggiornato in tempo reale su tutti i browser, modificabile anche offline. Si entra con l'account
  GitHub; chi fa il primo accesso crea il piano (vuoto, dai dati del browser o da un backup JSON) e
  invita i colleghi per username GitHub da Impostazioni → Membri, con i ruoli proprietario ed
  editor.
- Guida "Configura la tua istanza" dentro il sito, con i testi da copiare (dominio, nomi delle
  variabili, regole di sicurezza), per le copie che non hanno ancora un progetto Firebase.
- Cronologia delle modifiche (chi, cosa, quando), scritta insieme a ogni modifica e mostrata da
  Impostazioni → Cronologia.
- Indicatore di sincronizzazione nell'intestazione: Sincronizzato, Salvataggio, In attesa di rete,
  Errore.
- Sezione Account nelle Impostazioni, con uscita.
- Regole di sicurezza Firestore nel repository (`firestore/firestore.rules`), verificate
  dall'emulatore in CI: solo i membri leggono e scrivono, ogni modifica porta autore, ora e una voce
  di cronologia, i dati sono validati.
- Tema chiaro e tema scuro (Light Modern e Dark Modern), da Impostazioni → Aspetto; di serie
  seguono l'impostazione del dispositivo.
- Zoom del calendario su tre livelli: Dettaglio (due settimane), Mese e Trimestre (tre mesi a
  colonne settimanali, con totali e note della settimana). Si cambia dall'intestazione, con
  Ctrl + rotellina o avvicinando due dita; il browser ricorda il livello scelto.
- Le attività si spostano anche da tastiera: frecce per un giorno, Maiusc + frecce per la data di
  fine, Invio per aprirle, tasto menu per le altre azioni.
- Il trascinamento funziona anche con la penna.
- Totale del periodo visibile accanto alla riga dei valori giornalieri.
- "Azzera i filtri" nel riepilogo quando un filtro è attivo.

### Modificato

- Il riepilogo conta tutti gli stati, compresi "In revisione" e "Bloccato", con un'icona per
  ciascuno.
- Ogni periodo si apre sul giorno di oggi, quando è visibile, anche sul telefono.
- Un solo selettore di vista nell'intestazione; la bacheca settimanale usa le frecce
  dell'intestazione.
- I valori che non entrano nella colonna vengono abbreviati (per esempio 1,2 Mln); il valore esatto
  resta nel suggerimento.
- Testi di almeno 12 px e un contorno di focus ben visibile su ogni comando.
- Eliminare un'attività dal menu contestuale chiede conferma.
- Il browser ricorda anche le righe nascoste, l'evidenziazione dei weekend e la riga dei valori.
- Sul telefono l'intestazione scorre via invece di coprire il calendario.
- Senza progetto Firebase l'app funziona come prima, con i dati nel browser; a un browser nuovo
  propone di provare senza account o di configurare l'istanza.

### Corretto

- Alla fine di un trascinamento non si apre più la finestra dell'attività.
- Con l'app aperta in due schede, le modifiche di una scheda non cancellano più quelle
  dell'altra: ognuna vede subito le modifiche dell'altra.
- Dati salvati non leggibili vengono messi da parte una volta sola, invece che a ogni avvio.

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

[Unreleased]: https://github.com/stangoldbear/release-board/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/stangoldbear/release-board/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/stangoldbear/release-board/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/stangoldbear/release-board/releases/tag/v0.1.0
