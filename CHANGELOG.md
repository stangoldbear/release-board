# Changelog

Le modifiche rilevanti di ogni versione. Il formato segue
[Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/) e le versioni seguono il
[versionamento semantico](https://semver.org/lang/it/).

## [Unreleased]

## [0.8.0] - 2026-10-06

### Aggiunto

- La vista «2 mesi» di Next Releases e Roadmap, tra «Mese» e «Trimestre»: un giorno per colonna,
  largo la metà che in «Mese», così due mesi stanno nello schermo. Nelle intestazioni ogni giorno
  ha l'iniziale del giorno della settimana e il numero; una nota del calendario è un'icona, con il
  testo al passaggio del mouse e nel nome che legge lo screen reader. Anche Ctrl + rotellina e il
  pizzico passano per questa vista.
- «Titoli su una riga», accanto a «Nascondi giorni passati» in Next Releases e in Roadmap,
  ricordato dal browser per ciascuna area: le barre delle attività e le note sono alte una riga e
  il titolo resta intero su una riga, uscendo dal rettangolo quando è più lungo, con il colore
  della barra dietro di sé. Dove due titoli si toccano resta sopra la barra che inizia più vicino a
  oggi; la barra sotto il puntatore o con il focus viene in primo piano con tutto il suo titolo.
  Nella roadmap i titoli dei progetti e delle persone non vengono più accorciati con i puntini.

### Modificato

- Le colonne dei nomi del calendario e della roadmap restano sopra le barre anche quando una barra
  è in primo piano; la barra trascinata resta sopra tutto.

## [0.7.0] - 2026-10-06

### Aggiunto

- «Funzioni beta» nelle Impostazioni: una casella, ricordata da questo browser, che mostra le parti
  ancora in sviluppo. Per ora è la Roadmap, con la sua sezione delle impostazioni, la ricerca nei
  progetti e gli avvisi delle sue note: senza, la pagina ha le sole aree Note e Next Releases. I
  dati del piano sono gli stessi per tutti; cambia solo cosa mostra il browser.
- Note dei progetti, nella scheda «Note» della finestra del progetto: ogni nota ha testo, autore e
  data; si scrive e si aggiunge con Invio. «Altre opzioni» mostra lo stato (senza stato, da fare o
  fatta: le note da fare hanno una casella da spuntare), la scadenza con «Avvisa alla scadenza»,
  owner e tag separati da virgola, suggeriti da quelli già usati nel progetto. Dal giorno della
  scadenza l'avviso compare una volta per browser, con «Fatta» e «Chiudi».
- Campi personalizzati dei progetti, da Impostazioni → Roadmap → «Modifica i campi…»: etichetta,
  descrizione, tipo (`text`, `textarea`, `number`, `price` con la valuta, `url`, `date`, `choice`
  con i valori predefiniti) e le opzioni «più valori», «almeno uno» e «principale». Il nome inglese
  di tipi e opzioni ha accanto la traduzione e una scheda che li spiega. I campi si compilano nella
  scheda «Progetto»; i principali compaiono accanto al titolo nella roadmap.
- Team e persone, da Impostazioni → Roadmap → «Modifica team e persone…»: team con colore e tag,
  persone con nome, informazioni e assenze (dal, al, motivo). Nella roadmap un clic sul nome di una
  persona la modifica.
- Livello «Team» della roadmap: sotto ogni progetto una barra per persona, nel colore del suo team,
  dal primo all'ultimo giorno di lavoro. L'impegno si scrive in giorni o settimane (una settimana
  sono cinque giorni) e salta weekend, festività italiane e assenze, disegnate a strisce oblique
  rosse e rosa con una palma. La barra si trascina per cambiare il giorno di inizio; le frecce la
  spostano di un giorno, con Maiusc di una settimana. «+ Persona» e la scheda «Team» della finestra
  del progetto aggiungono e modificano le assegnazioni.
- Predefiniti della roadmap in un file leggibile del repository, `src/domain/roadmapDefaults.json`:
  otto campi (Team impattati, Jira request, Jira epics, Figma, Confluence, Stakeholder, Raw
  estimation totale ed elapsed), sei team e sedici persone. Un piano creato prima li carica con
  «Carica i predefiniti»; «Ripristina i predefiniti del repository» li rimette.
- «Festivi e weekend» e «Nascondi giorni passati» anche nella roadmap, con preferenze proprie: qui i
  giorni passati restano visibili di serie, perché la roadmap mostra anche i progetti conclusi.
- La ricerca guarda anche nelle note e nei campi dei progetti.
- I backup hanno lo schema 6, con note dei progetti, assegnazioni, campi, team e persone; gli
  schemi 3, 4 e 5 si leggono ancora. La cronologia registra anche queste modifiche.

### Modificato

- L'area «Roadmaps» si chiama «Roadmap» e ha lo stesso widget del periodo di Next Releases: «‹ mese
  anno ›», «Oggi», «Dettaglio», «Mese» e «Trimestre», con le stesse colonne del calendario, così le
  due linee del tempo si allineano. L'intervallo arriva fin dove arrivano i progetti, più un mese.
  Le scale «Mesi», «Trimestri» e «Anni» e le caselle di «Informazioni visibili» della 0.6 sono
  sostituite dai livelli «Solo titoli», «Info principali» e «Team».
- Nell'istanza condivisa servono le regole di Firestore nuove (raccolte `projectNotes`,
  `assignments`, `projectFields`, `teams` e `stakeholders`, campo `fields` dei progetti): senza,
  il piano si apre senza i dettagli dei progetti e l'indicatore di sincronizzazione lo spiega.
- Le parti del piano che le regole pubblicate rifiutano non sono più un errore di
  sincronizzazione: l'indicatore dice «Parti non disponibili», con il triangolo giallo, e le
  elenca nella sua scheda; lo stato del salvataggio resta leggibile. Le parti di una funzione beta
  spenta non contano.

## [0.6.0] - 2026-10-05

### Aggiunto

- Roadmaps, una nuova area sotto il calendario: una riga per ogni progetto, passato, in corso o
  futuro, con un rettangolo dal primo all'ultimo giorno su una linea del tempo tutta sua, a mesi
  («Mesi», «Trimestri») o a trimestri («Anni»), con oggi a un quarto della larghezza.
  - Un progetto ha titolo, inizio e fine, stato (idea, pianificato, in corso, completato, in pausa,
    ognuno con la sua forma), colore, responsabile e descrizione. Si crea con «Nuovo progetto» o
    con un clic su un mese dell'ultima riga, e si apre con un clic sul rettangolo.
  - Il rettangolo si sposta trascinandolo e i suoi bordi cambiano inizio e fine; dalla tastiera le
    frecce lo spostano di una settimana, con Maiusc cambiano la fine, e un lettore di schermo
    sente le date nuove.
  - Sotto la roadmap, «Informazioni visibili» sceglie cosa mostrare accanto al titolo: date, stato,
    responsabile, descrizione, oppure solo il titolo. Un clic sul titolo apre il progetto, come sul
    rettangolo, e porta il rettangolo in vista.
  - Sopra, il numero di progetti per stato. I progetti stanno nei backup (schema 5), nella
    cronologia e, nell'istanza condivisa, in Firestore con regole proprie.
- Le note libere si possono raggruppare per utente («Per utente», accanto a «Espandi»): una riga di
  note per autore, o una colonna quando sono espanse. L'ordine dei gruppi si cambia trascinando il
  nome dell'autore, con le frecce accanto al nome (comode sul telefono) o con Alt e le frecce sulla
  sua maniglia, e il browser lo ricorda; il proprio gruppo viene prima finché non si sposta. Dentro
  un gruppo le note non ripetono il nome dell'autore.
- La ricerca trova ciò che ha tutte le parole cercate, anche in punti diversi (per esempio titolo e
  assegnatario), oppure, con «Almeno una», ciò che ne ha almeno una. Le parole trovate sono
  evidenziate in attività, note, note libere e progetti.
- Mentre si cerca, sotto l'intestazione una barra dice cosa è stato trovato in ogni area e porta in
  vista i risultati uno alla volta, con le sue frecce o con Invio e Maiusc + Invio nel campo; sul
  telefono le frecce restano a portata di pollice in basso a destra. Il risultato ha un contorno
  tratteggiato, diverso da quello del focus; la sua area compare se era nascosta e il calendario
  va al suo giorno, mostrando i giorni passati se serve.

### Modificato

- La pagina è divisa in tre aree, Note, Next Releases e Roadmaps, che i pulsanti dell'intestazione
  mostrano o nascondono; un'area che compare viene portata in vista.
- L'intestazione tiene solo nome, lenti, «Compatta», i pulsanti delle aree, la ricerca, la
  sincronizzazione e le impostazioni. Mese, frecce, «Oggi», viste, «Nuova attività» e i comandi del
  fatturato stanno nel titolo dell'area Next Releases; il filtro per stato nel riepilogo delle
  attività.
- In Next Releases riepilogo, calendario e «Righe visibili» formano una sola scheda, con gli angoli
  arrotondati solo in cima e in fondo. Il fatturato è la prima delle righe visibili, prima delle
  corsie; «Festivi e weekend» e «Nascondi giorni passati» stanno a destra della stessa barra.
- I giorni passati sono nascosti di serie, anche nei browser che avevano già scelto di mostrarli.
- Le lenti scendono anche all'85% e al 75%, e ora valgono per note libere, fatturato, giorni,
  corsie, note dei giorni e roadmap: rimpiccioliscono testo, interlinea, spaziatura tra le lettere e
  lo spazio intorno alle barre.
- Ogni nota libera dice chi l'ha scritta, anche quelle proprie, su una seconda riga più piccola: il
  nome per esteso dal profilo GitHub, lo username finché il nome non è noto. La ricerca trova le
  note anche per nome.
- Le note libere hanno il testo a 12 pixel invece di 14, con meno spazio intorno, così ne entrano
  di più; quelle private iniziano con un lucchetto a colori invertiti, più visibile.
- «Espandi» mette le note una sotto l'altra, e si riordinano trascinandole in su o in giù, dentro il
  loro gruppo quando sono raggruppate.
- Nella Bacheca il fatturato dei giorni segue la riga «Fatturato» delle righe visibili.

### Corretto

- La linea di oggi nel calendario è piena: semitrasparente aveva un contrasto troppo basso.
- La vista scelta (Dettaglio, Mese, Trimestre, Bacheca) ha un segno di spunta, non solo uno sfondo
  diverso.

## [0.5.0] - 2026-10-05

### Aggiunto

- Note libere, in una fascia subito sotto la ricerca: una dopo l'altra su una riga che scorre,
  oppure espanse con il loro testo («Espandi»). Si aggiungono scrivendo il titolo e premendo Invio,
  e la fila mostra la nota nuova; un clic apre la nota, con titolo, testo, colore, promemoria,
  posto nella fila e il pulsante «Salva». Sul telefono la fascia parte chiusa («Mostra»).
  - Si riordinano trascinandole con il mouse, con Alt e le frecce dalla tastiera, e dalla finestra
    della nota («Posizione nella fila»), che vale anche sul telefono.
  - Con un promemoria, dal giorno scelto chi ha la nota nella fila vede un avviso aprendo il
    calendario, una volta per browser. L'avviso aspetta che le altre finestre siano chiuse, e un
    promemoria impostato nel browser in uso non si ripresenta.
  - In un'istanza condivisa ogni nota ha il suo autore, cioè chi la scrive: solo il ripristino di
    un backup conserva gli autori originali, e la cronologia lo registra. La fila mostra le tue
    note; «Tutte» mostra anche quelle degli altri membri, con il nome di chi le ha scritte. La
    ricerca guarda in tutte, anche per autore.
  - Una nota privata, scelta con il lucchetto accanto al campo o nella finestra della nota, tra i
    membri la vedi solo tu: le regole di Firestore la tengono in un'area che solo tu puoi leggere,
    e quello che scrivi non va nella cronologia né nei backup. Una nota che era condivisa lascia
    nella cronologia ciò che gli altri hanno già visto. Il lucchetto resta chiuso finché non lo
    riapri, così più note private di seguito non vengono condivise per sbaglio.
  - Un titolo come «Progetto: golive gennaio» mostra in grassetto la parte prima dei due punti,
    accanto al pallino del colore; orari come «14:00» e link restano interi. La finestra della nota
    ha l'anteprima del bottone e suggerisce cosa scrivere dopo i due punti: il golive di questo
    mese e dei quattro successivi, code freeze e rollout 100%. Un suggerimento prende il posto di un
    altro e non cancella mai il testo scritto.
- La ricerca cerca anche nelle note dei giorni e nelle note libere: il calendario mostra solo le
  note che contengono il testo e il riepilogo conta attività, note e note libere trovate.
- Lenti per la dimensione del testo del calendario, accanto alle viste: da 100% a 175%, con il
  valore in mezzo che riporta al 100%. Crescono corsie, note, attività, fatturato e date, con
  l'interlinea e un po' di spaziatura; intestazione, pulsanti, finestre e piè di pagina restano
  come sono. Sul telefono le lenti sono in Impostazioni → Aspetto.
- Modalità compatta («Compatta», accanto alle lenti): meno spazio intorno alle caselle e righe più
  strette, così ogni casella mostra più testo, per esempio tre righe del titolo di un'attività.
- 32 temi personalizzati ispirati ai temi più usati di Visual Studio Code, 12 chiari e 20 scuri, in
  Impostazioni → Aspetto → «Temi personalizzati». Ognuno tiene i colori del tema originale e
  rispetta il contrasto WCAG AA.
- Passando sopra «Sincronizzato», arrivandoci con la tastiera o toccandolo, una scheda dice quanto
  tempo fa e in che giorno e ora il piano si è sincronizzato l'ultima volta.
- Per togliere l'accesso a un proprietario, rimuovendolo o rendendolo editor, bisogna scrivere il
  suo username, come su GitHub per cancellare un repository. Prima di rimuovere un membro la
  finestra propone di scaricare il backup di tutto il piano.

### Modificato

- L'icona in alto è la stessa della scheda del browser.
- Versione e commit sono centrati in fondo a ogni schermata.
- I valori del fatturato che non entrano nella colonna si abbreviano allo stesso modo in ogni
  browser: «130K», «3,2 Mln» e, se serve, «3,2M»; 999.700 diventa «1M», non «1000K». Prima Chrome
  scriveva «3,2 Mio» e lasciava le migliaia per intero, tagliate dal bordo.
- Sotto i 1536 pixel di larghezza l'intestazione resta su una riga: si nasconde il sottotitolo e
  «Sincronizzato» mostra solo l'icona, con il testo nella scheda.
- I backup hanno lo schema 4, con le note libere; quelli della 0.4 si aprono ancora.
- Da 640 pixel di larghezza resta fissa solo la barra in alto, senza le note libere: occupa meno
  schermo, e la pagina scorre in modo che l'elemento con il focus non finisca sotto la barra.
- «Compatta» e i filtri accesi («Festivi e weekend», «Fatturato»…) mostrano una spunta, non solo
  un altro colore. Le lenti, ai loro limiti, tengono il focus e annunciano la nuova dimensione.
- Le finestre si aprono sul campo giusto: il titolo di attività e note, «Annulla» nelle conferme,
  «Ho visto» nei promemoria. Dopo aver eliminato un'attività il focus va a «Nuova attività», dopo
  una nota libera alla nota successiva.
- Nella riga delle note il tasto Tab si ferma sulle note e sul giorno di oggi, non più su ogni
  giorno: erano più di 300 fermate.
- Le parole lunghe nelle caselle vanno a capo con il trattino, dove il browser conosce l'italiano.

### Corretto

- In Dark Modern l'anello del focus è un azzurro più chiaro: sui comandi a segmenti non arrivava al
  contrasto 3:1. I test dei temi controllano ora anche il testo secondario sugli sfondi tenui, il
  link della fascia della modalità locale e il focus nelle celle del fatturato.
- I campi data accettano anni fino al 9999. Un anno di cinque cifre veniva salvato e, nella
  modalità locale, il piano non si riapriva più.
- La guida di creazione del piano scriveva «1 corsie» e non contava le note libere.

Con un'istanza condivisa le regole di Firestore sono cambiate, per le note libere e le note private:
pubblicale come nel passo «Pubblica le regole di sicurezza» della guida, prima di aggiornare il sito
o subito dopo: funzionano anche con la 0.4. Finché non le pubblichi il piano si apre
senza note libere, e «Sincronizzato» segnala un errore che spiega cosa manca.

## [0.4.0] - 2026-10-05

### Aggiunto

- Calendario continuo: i mesi si susseguono in un'unica linea del tempo che scorre in orizzontale e
  si allunga quando ci si avvicina alla fine, o all'inizio appena ci si ferma. Sopra i giorni c'è la
  riga dei mesi, con il nome che resta in vista e il totale del fatturato del mese.
  - Le frecce in alto portano al primo giorno del mese precedente o successivo e «Oggi» porta oggi
    al bordo sinistro, con uno scorrimento breve, immediato se il sistema chiede meno movimento.
    In alto c'è il mese che si sta guardando.
  - Oggi ha il numero sottolineato e una linea sottile lungo le corsie.
  - «Nascondi giorni passati» fa iniziare il calendario da oggi; altrimenti i giorni passati sono
    in grigio.
  - Il titolo di un'attività resta leggibile anche quando il suo inizio è uscito a sinistra.
- Import del fatturato previsto dal foglio Google scaricato in CSV («File» → «Scarica» → «Valori
  separati da virgola»), con «Importa da file» accanto a «Modifica valori».
  - Servono le colonne Date (per esempio 5-ott-26) e OV (per esempio 3.210.123,45). MONTH e day
    controllano le date, EU MARKETS e NON EU MARKETS sono le promozioni, Approval light (Green,
    Orange, Red) è il semaforo dei rilasci.
  - Prima di salvare, un'anteprima mostra i giorni trovati, quanti valori vengono sostituiti, i
    semafori, le promozioni e le righe scartate con il motivo.
  - Nella riga del fatturato e nella bacheca il valore prende il colore del semaforo, su uno sfondo
    più chiaro dello stesso colore e con una forma diversa per ogni semaforo. Passandoci sopra con
    il mouse, arrivandoci con la tastiera o toccandolo compaiono il valore esatto, il semaforo e le
    promozioni EU e non EU.
- La cronologia ha una pagina sua, da Impostazioni → «Apri la cronologia», al posto della finestra
  con le ultime 100 modifiche: filtri per periodo, autore e tipo di modifica, un riepilogo, il
  grafico delle modifiche per giorno con la sua tabella, le modifiche per autore e per tipo e
  l'elenco per giorno con ora, autore e campi cambiati.

### Modificato

- L'app usa tutta la larghezza della finestra: sugli schermi larghi il calendario mostra più giorni.
- La copia di un'attività ha lo stesso titolo, senza «(Copia)».
- I dati di esempio hanno semafori e promozioni.

### Corretto

- «Modifica valori» salva solo i giorni cambiati: prima riscriveva tutto il mese e arrotondava i
  valori con i centesimi.
- Il 4 ottobre, San Francesco d'Assisi, è festa nazionale dal 2026.
- Sul telefono la pagina non è più larga dello schermo: succedeva nello zoom Trimestre con una
  festività in vista.

Con un'istanza condivisa le regole di Firestore sono cambiate, perché il valore di un giorno può
avere semaforo e promozioni: ripubblicale come nel passo «Pubblica le regole di sicurezza» della
guida prima di importare il fatturato.

## [0.3.0] - 2026-10-05

### Aggiunto

- Le note si spostano su un altro giorno trascinandole con il mouse, nel calendario (zoom Dettaglio
  e Mese) e nella bacheca settimanale. Mentre la trascini, la nota compare sul giorno di arrivo e un
  avviso in basso dice dove andrà; Esc annulla.
- Un giorno ha una sola nota: un giorno che ne ha già una non accetta quella trascinata, e l'avviso
  lo dice.
- Altri modi per spostare una nota, senza trascinarla: da tastiera, le frecce sinistra e destra la
  spostano di un giorno; nella finestra della nota, il campo Giorno la porta su qualunque data, anche
  fuori dal periodo visibile. Sul telefono, dove il dito scorre il calendario, si usa questo campo.
- Nella cronologia uno spostamento è una sola voce: "ha spostato la nota dal … al …".

Le regole di Firestore non cambiano: aggiornando non serve ripubblicarle.

## [0.2.5] - 2026-10-01

### Corretto

- Passo "Registra l'app web" della guida: se il progetto ha già un'app web, la guida dice di lasciarla
  com'è e di aggiungerne una nuova per Release Board, e un approfondimento spiega perché. Indica anche
  dove leggere `firebaseConfig`: l'app nell'elenco, poi Configurazione in "Installazione e
  configurazione degli SDK".
- I percorsi nella console Firebase seguono il menu attuale: Impostazioni sotto Panoramica del
  progetto, Authentication in Sicurezza, Firestore Database in Database e spazio di archiviazione, e
  la ricerca dei prodotti.

## [0.2.4] - 2026-10-01

### Corretto

- Il passo "Crea l'app OAuth" della guida segue il modulo attuale di GitHub, "Register a new OAuth
  app": l'URL di callback di Firebase va nel campo Redirect URI, con Allow wildcard matching spento;
  Enable Device Flow e Expire user access tokens restano come li propone GitHub. Un approfondimento
  spiega ogni campo del modulo.

## [0.2.3] - 2026-10-01

### Aggiunto

- Approfondimenti espandibili nella guida alla configurazione, con il perché e le conseguenze di
  ogni scelta:
  - app OAuth nel proprio account o nell'organizzazione, e come trasferirla in seguito;
  - modalità di Firestore e località del database (nam5 o Europa), con le istruzioni per portare in
    Europa un database vuoto;
  - Authentication, dominio autorizzato, app web, chiave API dedicata, regole, variabili e primo
    accesso;
  - costi e limiti del piano gratuito.

### Modificato

- La guida usa le voci della console Google Cloud, «Firestore nativo» e «Firestore con
  compatibilità Datastore», e rimanda agli altri passi con il loro numero: con un database già in
  «Firestore nativo» si passa al passo 3.
- Per un team in Italia la guida consiglia la località `europe-west8` (Milano).

### Corretto

- La guida ricorda la variabile `PAGES_DEPLOY`, senza la quale un repository privato non pubblica il
  sito.

## [0.2.2] - 2026-10-01

### Aggiunto

- Versione e commit della build in fondo a ogni schermata: benvenuto, accesso, creazione del piano,
  caricamento, calendario e guida alla configurazione. Prima di seguire la guida si vede subito su
  quale versione si sta lavorando.

## [0.2.1] - 2026-09-30

Una guida alla configurazione più dettagliata, anche per un progetto Firebase già esistente.

### Aggiunto

- In cima alla guida "Configura la tua istanza" si sceglie tra "Creo un nuovo progetto" e "Ho già
  un progetto". Per un progetto esistente la guida spiega come controllare il database `(default)`,
  come convertirlo se è vuoto e in modalità Datastore, e come creare una chiave API dedicata,
  limitata al dominio del sito e alle API che servono, senza toccare le altre app del progetto.
- Ogni passo dice dove si fa (console Firebase, console Google Cloud o GitHub), con un link che
  apre la pagina in una nuova scheda, e descrive i clic uno per uno.
- Se l'accesso non riesce per le restrizioni della chiave API, il messaggio dice quale restrizione
  controllare.

### Modificato

- Se la console Firebase non permette di creare il progetto, la guida dice quale permesso manca.
- I messaggi di errore dell'accesso indicano il passo della guida per nome, non per numero.

### Corretto

- Le schermate che precedono il calendario (benvenuto, accesso, creazione del piano, guida alla
  configurazione) hanno i colori del tema: nella 0.2.0 comparivano senza colori, con le finestre
  trasparenti.

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

[Unreleased]: https://github.com/stangoldbear/release-board/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/stangoldbear/release-board/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/stangoldbear/release-board/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/stangoldbear/release-board/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/stangoldbear/release-board/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/stangoldbear/release-board/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/stangoldbear/release-board/compare/v0.2.5...v0.3.0
[0.2.5]: https://github.com/stangoldbear/release-board/compare/v0.2.4...v0.2.5
[0.2.4]: https://github.com/stangoldbear/release-board/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/stangoldbear/release-board/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/stangoldbear/release-board/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/stangoldbear/release-board/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/stangoldbear/release-board/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/stangoldbear/release-board/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/stangoldbear/release-board/releases/tag/v0.1.0
