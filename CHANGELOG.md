# Changelog

Le modifiche rilevanti di ogni versione. Il formato segue
[Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/) e le versioni seguono il
[versionamento semantico](https://semver.org/lang/it/).

## [Unreleased]

## [0.22.0] - 2026-10-27

**Le regole Firestore cambiano**: aggiornare il sito e ripubblicare le regole uno subito dopo
l'altro, e fare ricaricare la pagina a tutti i membri. Le regole nuove ammettono nelle voci della
cronologia ciò che serve ad annullare una modifica. Backup invariati.

### Aggiunto

- Annullare e ripetere le proprie modifiche, una alla volta e dalla più recente, dalla
  cronologia (clic su «Sincronizzato»): «Annulla» e «Ripeti», o `Ctrl+Z` e `Ctrl+Maiusc+Z` (`⌘Z`
  e `⇧⌘Z` sul Mac), con scritto cosa annullano e cosa ripetono. Valgono per le modifiche fatte
  dalla 0.22.0, anche dopo aver ricaricato la pagina o da un altro computer: ogni voce della
  cronologia conserva i documenti che la modifica ha scritto, com'erano prima e dopo, e
  annullarla li riscrive com'erano prima, insieme (un progetto eliminato torna con le sue note e
  le sue note sulla timeline). L'annullamento resta nella cronologia come la modifica inversa.
  Non si annulla una modifica se dopo qualcuno ha cambiato le stesse cose, né se riporterebbe la
  nota di un altro membro, che solo lui può scrivere: la pagina dice perché. Restano fuori le note
  private, i membri, i domini email ammessi e le importazioni.

### Corretto

- La lavagna di Notes in «Muratura», anche con le note raggruppate per utente, dopo aver ristretto
  la finestra teneva le colonne di prima: quelle che non entravano diventavano larghe pochi pixel,
  con il testo in verticale. Ora le colonne seguono la larghezza della finestra, in tutti e due i
  sensi.
- Con le regole Firestore di una versione precedente l'indicatore di sincronizzazione diceva
  «Parti non disponibili» e nascondeva la causa: ora dice «Regole da aggiornare», con le parti
  che mancano finché non vengono pubblicate. Dopo una modifica rifiutata il sito rilegge la
  versione delle regole, così l'avviso sparisce appena le regole giuste sono pubblicate, senza
  ricaricare la pagina. Le parti che mancavano all'apertura tornano ricaricandola, e l'avviso lo
  dice.

## [0.21.0] - 2026-10-27

**Le regole Firestore cambiano**: aggiornare il sito e ripubblicare le regole uno subito dopo
l'altro, e fare ricaricare la pagina a tutti i membri. Le regole nuove ammettono il colore delle
corsie e delle note dei giorni, le note in evidenza, i contatti e le loro note, e rispondono alla
versione che il sito controlla. I backup passano allo schema 9; restano leggibili quelli degli
schemi da 3 a 8, mentre una versione precedente rifiuta i nuovi backup anziché perdere dati.

### Aggiunto

- Scheda «Contatti», in beta (Impostazioni → Informazioni → Funzioni beta): l'organigramma
  dell'azienda, costruito a mano. Ogni persona ha nome, ruolo, team o ufficio, email, telefono e
  a chi riporta; chi non riporta a nessuno sta in cima. Si vede come organigramma, con le linee
  tra responsabili e collaboratori, o come elenco rientrato, di serie sul telefono. Ogni persona
  ha le sue note in Markdown, con autore e ora, da aggiungere, modificare ed eliminare.
  Eliminare una persona porta chi le riportava al suo responsabile ed elimina le note sulla persona.
  La ricerca della pagina trova le persone per nome, ruolo, team, email, telefono e note, e
  l'organigramma mostra anche i loro responsabili. Contatti e note sono condivisi con tutti i
  membri, con la cronologia e nei backup; le regole precedenti non li conoscono e la scheda lo
  dice.

- «Dividi…» nel menu contestuale delle barre, sotto «Duplica» (tasto destro, tasto menu o
  Maiusc + F10), e nelle informazioni della barra per il tocco: divide il lavoro di una persona,
  un blocco di contingency o un'attività di Next Releases (anche dalla sua finestra) in più parti
  che insieme fanno l'intera barra. La finestra chiede quante parti, la pausa tra una parte e
  l'altra (giorni lavorativi per il lavoro, giorni per le attività) e se copiare la nota in ogni
  parte; l'anteprima mostra le parti in proporzione, con i tagli da trascinare o da spostare con
  le frecce, e un piccolo calendario con pause e giorni liberi; l'elenco delle parti ha i giorni
  di ognuna, modificabili, e le date. «Parti uguali» le riporta uguali. La prima parte resta la
  barra di prima, le altre sono nuove; la disposizione del progetto diventa manuale.
- Ogni corsia di Next Releases ha un colore, che colora le sue attività: un'attività spostata in
  un'altra corsia ne prende il colore, e la finestra dell'attività non chiede più il colore quando
  la corsia ne ha uno. Anche la riga «Note» ha il suo colore, che colora le note dei giorni. I
  colori si scelgono in Impostazioni → Next Releases → Corsie, con l'anteprima accanto al nome;
  una corsia nuova parte con un colore che nessun'altra ha. Una scheda «Corsie di Next Releases»
  accanto a «Campi dei progetti» e «Team e persone» porta alle corsie. Le corsie delle istanze
  esistenti restano senza colore, e le attività con il loro, finché non se ne sceglie uno.
- Corsie predefinite di un piano nuovo e dell'esempio: Client iOS, Client Android, QA, Server e
  Content, ognuna con il suo colore, più la riga «Note».
- Note «In evidenza»: una casella nella finestra della nota la mette nella prima riga della
  lavagna di Notes, con una puntina sulla nota; le note in evidenza restano prima delle altre
  anche quando si spostano.
- La lavagna di Notes in «Muratura» dispone le note come una bacheca: le prime, cioè quelle in
  evidenza e poi le altre nel loro ordine, riempiono la prima riga, e ogni nota dopo va nella
  colonna più corta, così sotto le note brevi non restano colonne vuote. Tastiera, lettori di
  schermo e trascinamento seguono sempre l'ordine delle note.
- Markdown nei testi lunghi: note libere, note dei giorni, note dei progetti, delle persone,
  della contingency e sulla timeline, descrizione del progetto, campi «Testo lungo», info delle
  persone e note delle attività. Si scrivono titoli (`#`), **grassetto**, _corsivo_, barrato,
  `codice`, elenchi puntati e numerati, caselle (`- [ ]`, `- [x]`), citazioni, righe di
  separazione e link (`[testo](https://…)`, o un indirizzo scritto per intero); sotto ogni campo
  ci sono le indicazioni e il pulsante «Anteprima». Le note si vedono con gli stili nelle schede,
  nelle informazioni dei progetti e negli avvisi; dove stanno su una riga resta il solo testo.
  Le note già scritte restano come prima, a capo compresi. L'HTML scritto in una nota non arriva
  mai alla pagina e i link aprono solo indirizzi web o email.

### Corretto

- Un blocco di contingency duplicato compariva e spariva subito dopo quando l'istanza aveva
  ancora le regole Firestore di una versione precedente, che rifiutano i blocchi successivi al
  primo, e l'indicatore diceva solo «Errore». Ora il sito controlla a ogni avvio la versione
  delle regole pubblicate: se sono più vecchie, l'indicatore di sincronizzazione dice «Regole da
  aggiornare» e spiega che vanno ripubblicate, e lo ripete accanto a ogni modifica rifiutata.
  Con le regole aggiornate i blocchi duplicati restano. Quando un blocco in più non si può
  aggiungere (sei al massimo per progetto, o non c'è posto nel calendario) un avviso dice perché.

## [0.20.0] - 2026-10-21

**Le regole Firestore cambiano**: aggiornare il sito e ripubblicare le regole prima di usare i
segmenti e le note della contingency. Fare ricaricare la pagina a tutti i membri: una versione
precedente non conosce i nuovi segmenti. I backup passano allo schema 8; restano leggibili quelli
degli schemi da 3 a 7, mentre una versione precedente rifiuta i nuovi backup anziché perdere dati.

### Aggiunto

- Menu contestuale sulle barre dei progetti, delle persone e della contingency: «Mostra
  informazioni» e «Duplica», anche con il tasto menu o Maiusc + F10. Le icone «i» aprono le
  informazioni con gli stessi comandi anche al tocco.
- Le informazioni flottanti del progetto hanno una colonna con tutte le note del progetto,
  delle assegnazioni, dei segmenti della contingency e delle note sulla timeline, con la loro
  provenienza. Sul telefono le colonne si dispongono una sotto l'altra.
- Ogni rettangolo del lavoro ha le proprie informazioni con date, giorni e nota, e i comandi
  per modificarlo o duplicarlo, anche nella parte «Persone».
- La deadline ha una bandierina a scacchi sulla riga del progetto, accanto alla linea
  tratteggiata; il segno della deadline superata resta distinto.
- «Duplica» crea un altro segmento di lavoro dal primo giorno disponibile dopo la fine del
  precedente, saltando chiusure e assenze. I segmenti si spostano e si allungano da soli, hanno
  note indipendenti e stanno sulla stessa riga della persona o della contingency; eventuali
  sovrapposizioni vanno su linee separate. La contingency ammette il primo segmento più cinque
  successivi, per rispettare i limiti delle regole, con modifica ed eliminazione indipendenti.
- Un progetto si duplica con gli stessi titolo, campi, etichette, assegnazioni, contingency,
  note e milestone, con nuovi identificativi. Le copie delle note sono nuove note, con autore
  e ora di chi duplica; la cronologia originale non si copia.

### Corretto

- «Salva» nella finestra del progetto salva anche una nuova nota non ancora confermata con
  «Aggiungi». La bozza resta cambiando scheda; una nota già aggiunta non viene salvata due volte.
  Una scadenza della nota non valida impedisce di chiudere con «Salva» perdendo il testo.
- Le duplicazioni mantengono il titolo originale senza aggiungere la parola «copia».
- Aggiornato lo strumento di sviluppo Vite alla patch 8.3.4 per correggere gli advisory di
  sicurezza della versione precedente, senza nuove dipendenze.

## [0.19.0] - 2026-10-15

Le regole di Firestore e i backup non cambiano: un'istanza si aggiorna al tag senza ripubblicare le
regole. Le etichette sono un campo dei progetti, quindi vanno nei backup, nella cronologia e nel
file delle impostazioni come gli altri; la parte «Persone» mostra i dati che il piano ha già.

### Aggiunto

- Etichette sui progetti: quante ne servono a ogni progetto, ognuna con un nome e un colore. Si
  danno nella finestra del progetto, dove una parola nuova crea l'etichetta per tutti, si leggono
  nelle informazioni del progetto («i») e si gestiscono da Impostazioni → Roadmap → Etichette
  (nome, colore, ordine, eliminazione). Sono un campo dei progetti, quindi le regole di Firestore
  non cambiano.
- Filtro «Etichette» nella barra della timeline: solo i progetti con almeno una delle etichette
  scelte, o con tutte, e volendo anche quelli senza etichette. Resta nel browser; l'intestazione
  della Roadmap dice quanti progetti restano, e un progetto nuovo parte con le etichette del
  filtro, così non sparisce appena salvato.
- Vista «Persone»: una parte nuova della timeline, sotto la Roadmap, con la sua scheda in basso (o il
  suo pulsante nell'intestazione). Ogni persona ha una riga, nell'ordine dei team, con una barra per
  ogni progetto a cui lavora, nel colore del progetto, con il titolo e i giorni. Le barre che
  cadono negli stessi giorni stanno su più linee, e una banda rossa a strisce con il triangolo e il
  numero di giorni accanto al nome segna quando una persona ha più progetti insieme; le assenze
  sono a strisce su tutta la riga. Una barra si sposta di lato come nella Roadmap, si allunga dal
  bordo destro e, trascinata su un'altra persona o con Alt + frecce su e giù, passa il lavoro a
  quella persona: la Roadmap, la tabella dei giorni del progetto e i giorni uomo del piè di pagina
  seguono subito. I team si ripiegano uno per uno; l'intestazione dice quante persone lavorano oggi
  e quante hanno più progetti insieme.

### Corretto

- Passare da una sezione all'altra delle impostazioni non lascia più la pagina bianca: nei browser
  in cui gli scorrimenti restituiscono una promessa, come Chrome ed Edge dalla versione 150, il
  secondo clic chiudeva tutto con l'errore «… is not a function».

## [0.18.0] - 2026-10-15

Le regole di Firestore e i backup non cambiano: un'istanza si aggiorna al tag senza ripubblicare
le regole. Le scelte nuove dell'aspetto valgono per il browser in cui si fanno, come il tema. Le
corsie di Next Releases di un'istanza restano quelle di prima, con le loro attività: da questa
versione si possono rinominare, riordinare e aggiungere.

### Aggiunto

- Impostazioni → Next Releases → «Corsie»: le righe delle attività si aggiungono in fondo, si
  rinominano (due corsie non hanno lo stesso nome), si riordinano trascinandole o con le frecce e
  si eliminano solo quando non hanno attività, così nessuna attività si perde. Le modifiche valgono
  per tutti i membri e restano nella cronologia. La riga «Note» dei giorni resta sempre l'ultima.
- Sulla timeline una corsia si riordina trascinando il suo nome, o con Alt e le frecce sulla sua
  maniglia; un'attività passa a un'altra corsia trascinandola, come prima.
- I piani nuovi partono con una quarta corsia, QA.

- La riga «Note sulla timeline» raccoglie tutte le note che hanno un giorno, ognuna con la forma
  della sua provenienza: una bandierina per la nota del giorno di Next Releases, un post-it per le
  note di Notes nel giorno del loro promemoria (una pila con il numero quando sono più di una), i
  rombi delle note sulla timeline come prima. Al passaggio del mouse, al focus e al tocco una scheda
  mostra la nota; il clic apre la sua finestra, e su una pila prima l'elenco delle note. Un titolo
  si ferma prima del simbolo che segue, con i puntini, e dove non c'è posto resta solo il simbolo.
  Si spostano solo i rombi. La riga c'è con qualunque parte della timeline, anche con la sola Next Releases, e
  si toglie da «Righe».
- Impostazioni → Aspetto → «Note sulla timeline»: tutte le note su una linea (di serie) o una linea
  per tipo, e per ogni tipo «Simbolo e titolo», «Solo simbolo» o «Nascoste» e il colore, anche
  quello di ogni nota. Ogni scelta ha la sua anteprima.
- L'area Notes espansa è una lavagna: in alto le note con un giorno, come agenda dei prossimi 60
  giorni con i promemoria passati in testa o come mini timeline di sei settimane; sotto le note,
  in muratura (ogni nota alta quanto il suo testo, in ordine da sinistra a destra), in griglia o in
  lista. Le note si spostano trascinandole e con Alt e le frecce come prima; i gruppi per utente
  sono sezioni una sotto l'altra.
- Impostazioni → Aspetto → «Notes»: cosa c'è in alto, forma delle note (Post-it, Scheda,
  Essenziale), layout, lavagna (Sughero, Neutra, Puntinata, Ardesia) e colore delle note senza
  colore (Giallo post-it, di serie, o come il tema), ognuna con la sua miniatura. Il file delle
  impostazioni porta anche queste scelte e quelle della riga «Note sulla timeline».
- «Sincronizzato» dice sulla seconda riga chi ha fatto l'ultima modifica al piano. Il clic apre la
  cronologia; la scheda al passaggio e al focus dice anche cosa è cambiato e quando, e ha il suo
  «Apri la cronologia».

### Cambiato

- Le impostazioni sono divise per argomenti (Aspetto, Roadmap, Account e membri, Dati,
  Informazioni) con le loro sezioni: a sinistra l'elenco, a destra la sezione scelta con il suo
  percorso e dove vale la scelta («In questo browser» o «Per tutti i membri»). Sul telefono prima
  l'elenco, poi la sezione, con «Tutte le impostazioni» per tornare indietro. Il browser ricorda
  l'ultima sezione aperta. Dimensione del testo e densità sono anche in Aspetto → «Testo e
  densità», a ogni larghezza. I percorsi nelle guide seguono: per esempio i membri si invitano da
  Impostazioni → Account e membri → Membri, il backup è in Impostazioni → Dati → Backup.
- Nella scheda Notes l'area è sempre espansa e alta quanto le sue note; in All parte compatta e
  resta come la lascia l'utente. Le note senza colore sono gialle come i post-it, anche nella fila
  compatta; si torna al colore del tema dalle impostazioni.
- I rombi delle note sulla timeline hanno il contorno nel colore del testo, che si legge su ogni
  barra, e stanno sul loro giorno con il titolo alla loro destra.

### Corretto

- La descrizione della densità «Compatta» parlava ancora del livello Team: le barre sottili sono
  quelle di «Info principali».

## [0.17.0] - 2026-10-14

Le regole di Firestore e i backup non cambiano: un'istanza si aggiorna al tag senza ripubblicare
le regole. Chi usava il livello «Team» ritrova le stesse righe a «Info principali».

### Cambiato

- Roadmap, livelli delle righe: «Info principali» mostra ora sotto il titolo una riga sottile per
  ogni persona che lavora al progetto, con nome, team e giorni nella colonna e la barra nel colore
  del team (era il livello «Team»). «Team» diventa la vista per gli aggiustamenti fini: righe più
  alte (24 px alla dimensione normale del testo), barre con bordo, nome e giorni, che si spostano
  trascinandole, si allungano dal bordo destro e cambiano giorni con il doppio clic. Le lane con i
  nomi dentro la barra del progetto e la riga dei team sotto il titolo non ci sono più; «Solo
  titoli» resta com'è. Nella densità «Compatta» le righe da 8 px sono quelle di «Info
  principali»; «Team» tiene le sue righe.
- «Aggiungi una persona» è tra i comandi della riga di un progetto sia a «Info principali» sia a
  «Team».
- Icone nuove per i livelli, nella barra della timeline e su ogni riga: due barre sottili, tre
  barre sottili e vicine, tre barre spesse.
- La barretta del bordo destro delle barre del lavoro ha un alone nel colore della pagina e resta
  visibile su ogni colore, anche in tema scuro.
- Un menu di scelte, come «Ordina» e «Raggruppa», si apre sulla voce scelta.

### Aggiunto

- Vista «Più giorni», tra «2 mesi» e «Trimestre»: tutti i giorni interi che entrano nella
  finestra, uno per colonna e mai più stretti di 24 px; il numero segue la larghezza della
  finestra. I titoli delle attività e le note dei giorni stanno su una riga.
- Impostazioni → Roadmap → «Modifica i campi…»: il colore di ogni valore di una lista si sceglie da
  un menu che mostra il rettangolo del colore accanto al nome, sul pulsante e su ogni voce.

### Corretto

- Nei giorni troppo stretti per il fatturato la cella mostra solo il semaforo e il valore è nella
  scheda: prima il numero veniva tagliato e poteva leggersi come un altro.
- L'opzione «Principale» di un campo diceva che il valore compare a «Info principali»: ora dice
  che compare nelle informazioni del progetto (pulsante «i»).

## [0.16.0] - 2026-10-13

**Le regole di Firestore cambiano**: in un'istanza condivisa ripubblica `firestore/firestore.rules`
subito dopo l'aggiornamento, e fai ricaricare la pagina a chi la tiene aperta. Finché sito e regole
non sono della stessa versione, cancellazioni, inviti e modifiche dei membri vengono rifiutati.
Prima di rendere pubblico il sito Pages di un repository privato leggi il capitolo 3c di
`docs/ISTANZA-101.md`: dice anche perché su un dominio condiviso con altri siti Pages conviene un
dominio proprio. Le schede ancora aperte con la versione di prima si fermano all'aggiornamento:
vanno ricaricate. I backup restano allo schema 7: quelli di prima si leggono come prima.

### Sicurezza

- Corrette le due dipendenze con avvisi di sicurezza di gravità alta: `@grpc/grpc-js`, usata dalla
  parte Node di Firebase e non dal sito, passa alla 1.14.5 con un `overrides` in `package.json`,
  finché Firebase non la aggiorna da sé (anche la 13.0.0 chiede ancora la 1.9); `source-map-js`,
  usata solo nella build, passa alla 1.2.2. `npm audit` non segnala più nulla.
- Regole di Firestore più severe, da ripubblicare insieme all'aggiornamento:
  - si può creare solo il piano dell'istanza (`main`): prima chiunque avesse fatto l'accesso
    poteva creare piani propri e consumare la quota giornaliera del progetto;
  - ogni modifica vuole una voce di storico nuova, scritta nello stesso batch da chi modifica:
    una voce già esistente non vale più;
  - anche le cancellazioni, le modifiche dei membri e il nome del piano lasciano la loro voce di
    storico: il batch scrive anche il documento di chi scrive (`writers/{uid}`), che dice quale
    voce lo registra, perché un documento cancellato non può dirlo;
  - la voce di storico ha come autore il membro con il suo username, chiavi e lunghezze limitate;
  - creare il piano e ripristinare un backup (le voci che conservano gli autori delle note) sono
    solo dell'owner: un membro non può più firmare una nota con il nome di un altro;
  - date con mese e giorno plausibili, elementi delle liste di testo controllati (checklist,
    owner e tag delle note dei progetti), una sola metrica, quella dell'app;
  - la foto di un membro viene solo da GitHub, e si carica senza dire da quale sito.
- Impostazioni → Membri → «Domini email ammessi»: il proprietario può ammettere solo gli account
  GitHub con un'email principale verificata di alcuni domini, per esempio quello aziendale. Chi
  ne resta fuori non vede più nemmeno il nome del piano, anche se è tra i membri, e la pagina
  d'accesso spiega il perché. Le regole controllano i domini a ogni richiesta e rifiutano una
  lista che lascerebbe fuori il proprietario che la scrive; senza lista tutto resta come prima.
- In un'istanza condivisa il browser non tiene più nulla sul disco: il piano sta nella memoria
  della pagina e l'accesso dura quanto la scheda (una scheda nuova chiede di accedere di nuovo,
  ricaricare la pagina no). Su un computer condiviso non resta una copia del piano, e gli altri
  siti dello stesso indirizzo, come i siti Pages pubblici di un'organizzazione su
  `<organizzazione>.github.io`, non trovano sul disco né l'accesso né il piano. All'aggiornamento l'accesso si
  sposta da solo nella scheda e la copia tenuta dalle versioni precedenti si cancella; uscire
  ricarica la pagina. Lasciare la pagina con modifiche non ancora inviate chiede conferma, perché
  senza la copia sul disco andrebbero perse. Si legge un po' di più dal database a ogni apertura.
- Un'istanza con un progetto Firebase chiede ai motori di ricerca di non indicizzarla
  (`noindex`); il sito dimostrativo senza Firebase resta indicizzabile.
- In un'istanza condivisa il ripristino di un backup e i dati di esempio sono solo del
  proprietario del piano, come vogliono le regole: gli altri membri scaricano i backup, e il
  piano vuoto dice loro a chi chiedere. La configurazione della roadmap e il fatturato previsto
  si importano come prima.
- La CI fallisce se una dipendenza ha un avviso di sicurezza di gravità alta o critica
  (`npm audit --audit-level=high`) e gira anche una volta a settimana, perché un avviso nuovo può
  comparire senza commit nuovi. Il workflow di pubblicazione del sito fa lo stesso controllo, più
  lint, tipi e test, prima della build: un sito si pubblica solo da un commit che li supera.

### Aggiunto

- Preset di colori in Impostazioni → Aspetto, sopra il tema scelto: cambiano i 24 colori di
  attività, progetti, team, note sulla timeline e valori dei campi. «Pastello», quello di serie,
  ha tinte chiare e tenui, tutte della stessa luminosità, perché nessuna sovrasti le altre;
  «Morbido» ha colori smorzati, più presenti; «Regolare» tiene i colori pieni di ogni tema, come
  prima; «Solarized» usa gli accenti della tavolozza Solarized. Ogni preset ha la sua anteprima,
  vale con i temi dell'app e con quelli personalizzati, tiene il testo dei colori a 4,5:1 sul suo
  sfondo, e il browser lo ricorda; il file delle impostazioni lo esporta e lo importa con il resto
  dell'aspetto.

### Cambiato

- La «Hard deadline» di un progetto si chiama «Deadline», nella finestra, nelle informazioni, sul
  segno della deadline superata, negli avvisi e nella cronologia.
- Un progetto dura quanto il lavoro del suo team: va dall'inizio all'ultimo giorno della barra
  più lontana, persone o contingency. Senza giorni del team la barra è lunga un giorno, quello
  d'inizio, e la finestra lo dice invece di chiedere una durata. La barra di un progetto non ha
  più bordi da trascinare: si sposta intera, col lavoro del team; le frecce la spostano di una
  settimana, e Maiusc + frecce non cambia più la fine.
- I dati di esempio danno a ogni progetto il lavoro di qualche persona e una deadline.

### Rimosso

- «Fine pianificata» e «Giorni uomo del progetto» non esistono più, nemmeno nella vista avanzata
  della finestra del progetto, né con il doppio clic sulla barra. I valori che un progetto aveva
  vengono ignorati e non finiscono altrove (la deadline resta quella che era); in un'istanza
  condivisa spariscono dal documento alla prima modifica del progetto, come vogliono le regole
  nuove, e non entrano più nei backup. La cronologia delle modifiche passate li mostra ancora.

## [0.15.0] - 2026-10-13

Le regole di Firestore e i backup non cambiano: un'istanza si aggiorna al tag senza ripubblicare
le regole.

### Aggiunto

- Tre densità di note e calendari, dal menu nell'intestazione che prende il posto di «Compatta»:
  «Large» (l'aspetto senza la modalità compatta), «Standard» (la modalità compatta di prima, ora
  quella di serie) e «Compatta», che al livello Team fa le barre delle persone alte 8 px e una
  attaccata all'altra, così ogni progetto occupa meno spazio in altezza; nella colonna nome, team e
  giorni di ogni persona sono scritti più piccoli, quanto basta per entrare nella riga, e interi nel
  suggerimento della riga e della barra. Il browser ricorda la scelta; quella della vecchia «Compatta» non si legge
  più.
- Un clic su un giorno della riga «Giorno» dice in fondo alla pagina, prima della versione, i
  giorni uomo che ogni team spende in quel giorno su tutti i progetti, con i tag dei team e il
  totale (per esempio «BA:1, SSide:3, iOS:4 · totale 8»); un altro clic, o la X accanto, lo toglie.
  Le frecce scorrono i giorni, Invio sceglie.
- Il pulsante «i», primo tra i comandi della riga di un progetto, apre le sue informazioni in una
  piccola finestra accanto alla colonna, che si sposta trascinandone la barra e si chiude con la X
  o con Esc.

### Cambiato

- La colonna dei progetti ha a ogni livello l'aspetto del livello Team: la righina verticale nel
  colore del progetto e l'etichetta della dimensione accanto al titolo, al posto della linguetta
  verticale.
- L'etichetta della dimensione resta anche con «Colori dei progetti» su «Liberi», sempre nel
  colore del suo valore; il campo dell'etichetta si sceglie nelle impostazioni con tutte e due le
  modalità.
- Le informazioni del progetto non compaiono più fermando il mouse sul titolo o portando il focus
  sulla barra: si aprono solo dal pulsante «i».
- Nella finestra di un progetto il campo della dimensione è subito sotto il titolo, nella vista
  Standard e in quella Avanzata.
- Le barre delle persone non hanno più il contorno: solo il colore del team, con la barretta del
  bordo destro che dice dove si trascinano i giorni.
- Le righine oblique sui giorni di un progetto senza lavoro sono più leggere.
- Il colore Ghiaccio ha un riempimento azzurro-grigio leggero invece di essere quasi bianco.
- Il testo di una nota dei giorni non esce più dal suo rettangolo, così le note di giorni vicini non
  si sovrappongono: a «Solo titoli» è una riga con i puntini, con «Espandi» qualche riga in più,
  sempre dentro il giorno, e nei giorni stretti un'icona. Una nota che non ci sta intera si legge
  nella scheda che si apre fermandoci sopra il mouse o portandoci il focus, e nella finestra che si
  apre con un clic; nella vista Trimestre la scheda elenca le note della settimana.

### Corretto

- Al livello Team un progetto colorava tutta la sua riga, anche i giorni prima dell'inizio e dopo
  la fine: ora il colore è solo nella sua barra.
- Impostazioni → Roadmap → «Campi dei progetti»: i valori di una lista si possono rinominare; la
  chiave resta la stessa, così i progetti che li hanno scelti li conservano.

## [0.14.0] - 2026-10-13

Con un'istanza condivisa le regole di Firestore sono cambiate (i colori nuovi e le chiusure
aziendali nel documento `settings/roadmap`): ripubblicale come nel passo «Pubblica le regole di
sicurezza» della guida, prima di usare le funzioni nuove. Dopo l'aggiornamento chi ha la pagina
aperta la ricarica: una pagina ancora della 0.13 che salva le impostazioni della roadmap (formula
della contingency, colori dei progetti) toglierebbe le chiusure aziendali. I backup restano allo
schema 7.

### Aggiunto

- Otto colori in più per attività, note, progetti, note sulla timeline, team e valori dei campi
  (24 in tutto): Blu, Ciano, Petrolio, Verde bosco, Ambra, Bordeaux, Prugna e Ardesia, leggibili
  in tutti i temi. Le istanze collegate a Firebase devono ripubblicare le regole di sicurezza per
  salvarli.
- Impostazioni → Roadmap → «Team e persone»: ogni team si riduce alla sua intestazione («Riduci
  tutti» li chiude tutti) e si sposta trascinandolo per la maniglia o con le frecce; il colore si
  cambia dall'intestazione; la formula dei giorni uomo si modifica subito sotto il nome del team,
  con il suo «Salva»; in alto, tre esempi di formule da copiare, scritti con i tag dei propri team.
- Impostazioni → «Chiusure aziendali»: i giorni in cui l'azienda è chiusa, con le date e il
  motivo, validi per tutti. Sulla timeline sono a righine rosse (nell'intestazione una fascia a
  righe sotto il giorno, il motivo nel suggerimento), anche nella Bacheca e nella legenda
  dell'aiuto; per il lavoro contano come sabati e domeniche: le barre delle persone e la
  contingency li saltano, la disposizione dei progetti e i giorni oltre la hard deadline ne
  tengono conto. Le istanze collegate a Firebase devono ripubblicare le regole di sicurezza;
  «Ripristina i predefiniti» le conserva, e i backup le portano con sé.
- Impostazioni → Backup → «Impostazioni»: esporta in un file le impostazioni senza i dati (campi,
  team e persone, colori dei progetti, formule, chiusure aziendali e l'aspetto del browser: tema,
  formato delle date, layout, dimensione del testo) e le reimporta. L'importazione è «best
  effort»: mostra cosa contiene il file e cosa non riesce a leggere (per esempio un file di
  un'altra versione), lascia scegliere le parti da applicare, scarica prima una copia delle
  impostazioni attuali e legge anche la configurazione da un backup dei dati.
- «Espandi» nella riga delle note dei giorni: ogni nota mostra il testo intero, in poche righe
  che, se il giorno è stretto, passano sopra i giorni seguenti; nella vista Trimestre ogni
  settimana elenca le sue note con la data. «Riduci» torna alla riga compatta; il browser
  ricorda la scelta.

### Cambiato

- Le note dei giorni stanno dentro la parte «Next Releases», subito sotto le corsie (sotto
  «CONTENT» nel piano reale), e si ripiegano con lei; prima erano una riga a sé sopra la parte.
- L'ordine dei team scelto nelle impostazioni è quello della tabella dei giorni di un progetto
  nuovo o modificato e delle persone di un progetto nella roadmap (prima contava la fase); la fase
  decide ancora dove cadono le barre nella disposizione standard. Nei predefiniti i team sono
  nell'ordine del lavoro: Business analysis, Server side, iOS, Android, Content, QA.

## [0.13.0] - 2026-10-13

### Cambiato

- Una sola barra di scorrimento verticale, quella della pagina: la timeline non scorre più dentro
  sé stessa ed è alta quanto le sue righe, così con molti progetti o una finestra bassa nessun
  contenuto resta nascosto tra due barre. Mesi, fatturato e giorni restano fermi sotto
  l'intestazione della pagina (in cima sul telefono) mentre si scorre, e una barra di scorrimento
  orizzontale resta in fondo alla finestra, sopra le schede: righe, giorni in alto e barra si
  muovono insieme con la rotellina, il dito, la barra, i salti del periodo e lo zoom. Un elemento
  col focus o un risultato della ricerca non finisce sotto le righe ferme.
- Roadmap: il lavoro del team si disegna sempre con le lane dentro la barra del progetto; le rese
  «Righe sotto il progetto» e «Fasi su una barra», con la scelta «Resa delle barre» nelle
  impostazioni, non ci sono più.
- Righe dei progetti più basse a ogni livello, con le stesse informazioni, perché si vedano più
  progetti insieme: il titolo nella barra è più stretto e c'è meno spazio intorno.
- «Solo titoli»: righe di 38 px invece di 48 alla dimensione normale e la linguetta della
  dimensione con un testo più piccolo.
- «Info principali»: sotto il titolo del progetto una lane per ogni persona e per la contingency,
  tutte alte uguali, una riga di testo con il nome e i giorni uomo; la riga cresce con il team.
  Le lane fanno parte del disegno del progetto e non si trascinano: il progetto si sposta dal
  titolo.
- «Team»: nella colonna dei nomi il progetto e le sue persone formano un blocco, legato da un
  binario nel colore della dimensione, dal titolo all'ultima persona, e da un albero; accanto al
  titolo l'etichetta della dimensione, accanto a ogni persona il team e i giorni uomo. Sui giorni
  il rettangolo del progetto, nel suo colore, scende intorno al lavoro delle sue persone, come un
  piccolo gantt, e i rettangoli di due progetti quasi si toccano; tutto il blocco del progetto,
  nomi e giorni, sta in un rettangolo con il bordo nel colore del progetto e lo sfondo del colore
  della sua barra al 25%; il lavoro di ogni persona è una
  barra nel colore del suo team, alta quasi quanto la sua riga di una riga di testo, così le barre
  di un team sono quasi unite, con nome, giorni e date in un suggerimento al passaggio del mouse e
  al focus; si trascina e si allunga come prima, e sul bordo destro una barretta dice dove si
  allunga. «Aggiungi una persona» è tra i comandi della riga del progetto, accanto ai livelli, al
  posto della riga «+ Persona». Un progetto con tre persone occupa 81 px invece di 180.
- Hard deadline superata: un solo segno, un disco rosso sulla linea della deadline, nel punto in
  cui il lavoro la supera e sopra tutte le barre a ogni livello (non più un triangolo in fondo alla
  barra o nascosto sotto). Al passaggio del mouse il segno si ingrandisce e una scheda dice la
  deadline, quando finisce il lavoro, di quanti giorni lavorativi la supera, chi lavora oltre, e
  apre il progetto; la stessa scheda si apre al focus e al tocco. La linea tratteggiata della
  deadline passa sopra le barre: si vede quale lavoro la supera.

### Corretto

- Un progetto con il livello «Solo titoli» scelto solo per lui ha il titolo su una riga, come
  quando lo stesso livello vale per tutta la timeline.
- La maniglia della colonna dei nomi resta sul bordo della colonna anche dopo aver scorso i giorni.

## [0.12.0] - 2026-10-12

### Aggiunto

- Lo stato di un progetto segue la data di oggi: un progetto pianificato con oggi tra inizio e
  fine effettiva è in corso, uno pianificato o in corso con oggi oltre la fine è completato; idee,
  progetti in pausa e completati restano come sono. La timeline, i conteggi e l'ordine mostrano lo
  stato di oggi; sulla colonna di oggi il progetto porta un triangolo che apre un pannello con lo
  stato di prima e quello di ora, il perché, «Conferma», che salva lo stato per tutti con il nome
  di chi conferma nella cronologia, e «Apri il progetto»; la finestra del progetto propone lo
  stato nuovo e salvando lo conferma; la scheda del progetto dice che è da confermare. Nessuna
  scrittura automatica: lo stato salvato cambia solo con una conferma.
- Una sola timeline per Next Releases e Roadmap, sugli stessi giorni: un solo periodo e zoom, un
  solo livello di dettaglio («Solo titoli» mette anche i titoli delle attività su una riga, al
  posto del chip «Titoli su una riga»), una sola colonna dei nomi, il fatturato in cima, le note
  dei giorni e le note sulla timeline vicine, poi le corsie delle attività e i progetti, ognuno
  sotto un'intestazione con i conteggi per stato, che è anche la legenda, e una freccia che
  ripiega la parte. Le schede in fondo restano quattro: «Next Releases» e «Roadmap» mostrano la
  timeline con la sola parte corrispondente, «All» entrambe; nel layout «Pulsanti in alto» i due
  pulsanti mostrano e nascondono le parti. Un solo pulsante «Nuovo» con un menu: attività,
  progetto o nota sulla timeline. La Bacheca resta una vista delle attività.
- La timeline scorre dentro la finestra: mesi, fatturato e giorni restano in alto e i nomi a
  sinistra mentre si scorrono le righe, e un elemento portato in vista non finisce sotto di loro.
  Il bordo della colonna dei nomi, nelle righe in alto, si trascina per cambiarne la larghezza
  (anche con le frecce, Home e End; doppio clic per quella di serie); il browser la ricorda.
- Le righe dei progetti a «Info principali» hanno due righe: l'icona dello stato e il titolo,
  troncato, e sotto i team al lavoro; sul bordo sinistro una linguetta con il valore del campo
  che colora i progetti (di serie «Dimensione»), scritto dal basso in alto nel suo colore. Ogni
  riga di un livello ha la stessa altezza: la barra è alta quanto la riga, con una fascia fissa
  sotto il titolo che le lane si dividono o la striscia delle fasi riempie. Periodo, giorni uomo,
  responsabile, hard deadline, descrizione, campi principali con i link e persone con i giorni
  stanno in una scheda che si apre fermando il mouse sulla cella, al focus della barra o con un
  tocco. Nella finestra, accanto a un campo link c'è il pulsante che lo apre, e un campo di più
  link li elenca.
- I comandi della timeline stanno tutti in alto: «Righe» (fatturato, note, corsie, parti),
  «Ordina», «Raggruppa» e «Fatturato» sono menu, i livelli una fila di tre icone, festivi e giorni
  passati due icone, tutti con un suggerimento al passaggio e al focus; «?» apre l'aiuto con i
  gesti, i tasti e la legenda degli stati e dei segni; i paragrafi di istruzioni escono dalla
  pagina. La colonna di oggi porta «Oggi» sotto il numero e la riga sotto il mouse si illumina,
  nome e giorni.

### Cambiato

- Le preferenze della roadmap `roadmap-zoom`, `roadmap-fit-days`, `roadmap-highlight-weekends`,
  `roadmap-past-days-hidden` e `roadmap-titles-one-line`, e `titles-one-line` del calendario,
  non si leggono più: valgono quelle del calendario per tutta la timeline, con i giorni passati
  nascosti di serie anche per i progetti. `roadmap-detail-level`, `roadmap-project-levels`,
  `roadmap-bars`, `roadmap-sort` e `roadmap-group-by` restano; nuove `label-width`,
  `timeline-collapsed` e `show-timeline-notes`.
- Le icone dei livelli sono righe (una, due, tre) al posto dei tratti.

## [0.11.1] - 2026-10-12

La 0.11.0 non è stata pubblicata: le sue modifiche escono con questa versione.

### Aggiunto

- Due layout della pagina, scelti in Impostazioni → Aspetto e ricordati dal browser. Di serie
  «Schede in basso»: una barra fissa in fondo alla finestra, come le schede di un foglio di
  calcolo, con «All», «Notes», «Next Releases» e «Roadmap»; «All» mette le aree una sotto l'altra,
  le altre ne mostrano una sola, e il browser ricorda la scheda aperta. Da 640 px versione e
  commit stanno nella barra. «Pulsanti in alto» è il layout di prima, con i pulsanti
  nell'intestazione che mostrano e nascondono le aree. Portare in vista un risultato della ricerca
  apre la scheda della sua area.
- Impostazioni → Roadmap → «Modifica team e persone…»: ogni team ha una fase, Analisi, Sviluppo
  o Test, che dice dove sta il suo lavoro nella disposizione standard di un progetto, e può avere
  una formula sui tag dei team senza formula, come `0.12*(ServerSide+iOSDev+AndDev)`, che
  riempie i suoi giorni uomo in un progetto nuovo; ogni persona può essere «membro di default»,
  cioè stare nella tabella dei giorni di ogni progetto nuovo; in fondo alla finestra la formula
  della contingency, una barra del progetto senza persona. Nei predefiniti BA e QA hanno il 12%
  dei giorni di ServerSide, iOSDev e AndDev, la contingency il 10%, e la prima persona di ogni
  team è di default. Le regole di sicurezza cambiano (`phase`, `formula`, `default` e il
  documento `settings/roadmap`); i backup passano allo schema 7, e quelli dalla 3 alla 6 si
  leggono ancora.
- La finestra del progetto ha due viste, «Standard» e «Avanzata», ricordate dal browser e sullo
  stesso modulo: la standard ha titolo, «Data inizio lavori del team», «Hard deadline», la tabella
  «Fase / Ruolo | Man Days», la disposizione nel Gantt, il colore e i campi «In primo piano»;
  l'avanzata aggiunge «Fine pianificata», i giorni uomo del progetto, stato, responsabile,
  descrizione e tutti i campi. La tabella parte dai membri di default; le righe dei team con una
  formula, e la contingency, si calcolano dai giorni scritti per gli altri team, arrotondati alla
  mezza giornata, e si possono scrivere a mano e riportare alla formula; un pulsante aggiunge la
  persona successiva di un team («Server #2»), una lista chiunque altro, la matita apre inizio e
  nota del lavoro. La scheda Team non c'è più. Un progetto si salva con una durata: i giorni del
  team, una fine pianificata o i giorni uomo del progetto.
- Salvando, il lavoro del team si dispone nel Gantt secondo la «Disposizione nel Gantt»:
  «Standard» (Analisi, poi Sviluppo in parallelo, poi Test, poi la contingency), «Parallelo»,
  «In sequenza» o «Manuale», che lascia le barre dove sono; le barre partono sempre da un giorno
  lavorativo. La contingency è una barra del progetto senza persona. La fine del progetto è
  calcolata: l'ultimo giorno tra fine pianificata, giorni uomo del progetto e lavoro del team con
  la contingency; la barra mostra i giorni uomo totali e, trascinata o mossa con le frecce (una
  settimana), porta con sé il lavoro del team, sui giorni lavorativi; il bordo destro cambia la
  fine pianificata (anche Maiusc+frecce), il sinistro l'inizio solo senza barre del team. La hard
  deadline resta ferma, e la tabella avvisa quando il lavoro la supera.
- Tre rese della barra di un progetto, scelte in Impostazioni → Roadmap → «Resa delle barre» e
  ricordate dal browser: «Lane dentro la barra», di serie, con una striscia sottile per persona nel
  colore del team e una grigia per la contingency sotto il titolo; «Fasi su una barra», con una
  striscia divisa in Analisi, Sviluppo, Test e contingency e i giorni uomo di ogni fase; «Righe
  sotto il progetto», la barra sola. In tutte la barra è piena dove il team lavora e sbiadita, con
  un tratteggio, nei giorni senza lavoro: prima della prima barra, nei buchi e oltre l'ultima
  barra fino alla fine pianificata; dentro c'è il totale dei giorni uomo. Al livello «Team» ogni
  resa mette sotto il progetto una riga per persona, con «Nome · gg», e una per la contingency.
- Ogni progetto può avere le sue righe: tre pulsanti nella colonna del nome, una, due o tre righe
  come «Informazioni visibili» in basso, che ora ha le stesse icone e, premuto, riporta tutti i
  progetti al suo livello. La scelta resta nel browser.
- La hard deadline è una linea rossa tratteggiata nella riga del progetto; dove il lavoro la
  supera compare un triangolo, sulla linea, sulla barra del progetto e su ogni barra oltre.
- Le barre delle persone, e quella della contingency, si allungano dal bordo destro, che cambia i
  giorni uomo contando i giorni lavorativi, e con un doppio clic si scrivono i giorni in un campo
  sulla barra; lo stesso doppio clic sulla barra di un progetto senza team scrive i giorni uomo
  del progetto. Spostare una persona o la contingency a mano rende «Manuale» la disposizione del
  progetto, finché la sua finestra non la riapplica.
- Impostazioni → Roadmap → «Colori dei progetti», condivisa da tutti i membri: di serie «Dal
  campo», la barra di ogni progetto ha il colore del suo valore nella prima lista di valori
  esclusivi con i colori, come «Dimensione», o in quella scelta quando ce n'è più d'una, ed è grigia
  senza valore; la finestra del progetto non chiede il colore e lo dice. Con «Liberi» ogni progetto
  ha il colore scelto nella sua finestra, e uno nuovo prende il colore dopo quello dell'ultimo. Le
  regole di sicurezza ammettono `projectColors` e `colorFieldId` nel documento `settings/roadmap`.
- L'ordine dei progetti: «Ordina per» sotto la roadmap, ricordato dal browser, con
  «Personalizzato» di serie, poi Inizio, Fine, Deadline più vicina (le deadline future dalla più
  vicina, poi i progetti senza deadline, poi quelle passate), il campo con i colori come
  «Dimensione», Stato e Titolo; a parità resta l'ordine personalizzato, e dentro i gruppi vale lo
  stesso ordine. L'ordine personalizzato è condiviso nel piano: si cambia trascinando una riga
  dalla colonna dei nomi, con Alt + frecce su e giù sulla barra, o con «Posizione nella roadmap»
  nella vista avanzata della finestra; uno spostamento cambia un solo progetto (`position`,
  frazionaria come le note libere), e trascinando con un altro criterio attivo si torna a
  «Personalizzato» dall'ordine che si vede. Le regole di sicurezza ammettono `position`.
- Avviso di scadenza di un progetto, nella vista avanzata della sua finestra: nessuno, il giorno
  stesso o da 1 giorno a 1 mese prima della hard deadline, o senza di essa della fine del lavoro
  del progetto. All'apertura della bacheca una finestra elenca i progetti in scadenza, con «Apri il
  progetto»; compare una volta per browser per ogni giorno di scadenza, aspetta che si chiudano le
  finestre aperte, e tace per i progetti completati. Le regole di sicurezza ammettono
  `remindDaysBefore`.
- Note sulla timeline: un rombo su un giorno della roadmap, nella riga del suo progetto o nella
  riga «Note sulla timeline» in cima quando non ha un progetto, con titolo accanto, colore, testo
  nella scheda al passaggio del mouse o al focus, e un avviso facoltativo il giorno della nota,
  nella stessa finestra delle scadenze dei progetti. Si crea con un clic su un giorno vuoto di una
  riga di progetto o della riga in cima, si trascina per cambiare giorno, le frecce la spostano di
  un giorno (una settimana con Maiusc), e la ricerca la trova per titolo, testo e progetto. È una
  raccolta nuova, `milestones`, nella parte «Dettagli dei progetti»: le regole di sicurezza la
  ammettono, i backup la portano, la cronologia la registra; l'esempio ne ha due.
- I campi della roadmap hanno il contrassegno «In primo piano», che li mostra nella vista standard
  del progetto; nei predefiniti ce l'ha «Dimensione». Le regole di sicurezza cambiano (`quick` nei
  campi; `endDate` facoltativo, `manDays`, `deadline`, `contingency` e `arrangement` nei progetti)
  e i backup allo schema 7 li portano.
- Sedici colori per attività, note libere, progetti, team e valori delle liste, otto in più:
  arancione, corallo, rosa, magenta, verde acqua, lime, oliva e marrone, in tutti i temi e con il
  contrasto del testo controllato come per gli altri. Le regole di sicurezza li ammettono.
- Il formato delle date scritte per esteso si sceglie in Impostazioni → Aspetto e resta nel
  browser: `gg-mm-aa` di serie, oppure `gg-mm-aaaa`, `gg/mm/aaaa`, `aa-mm-gg` o `aaaa-mm-gg`. Vale
  per etichette, schede, finestre, avvisi, cronologia e messaggi; i mesi abbreviati come «nov
  2026», le intestazioni dei giorni e i campi data del browser non cambiano.

### Modificato

- La Roadmap non è più una funzione beta: l'area, la sua sezione nelle Impostazioni, la ricerca
  nei progetti e gli avvisi delle note dei progetti ci sono per tutti. L'interruttore «Funzioni
  beta» resta nel codice per le prossime funzioni in prova e non compare finché non ce ne sono.
- Le date per esteso sono scritte `gg-mm-aa` invece di `gg/mm/aaaa`, salvo scegliere altrimenti.
- L'area «Note» si chiama «Notes», come le altre due aree.
- La fine di un progetto non è più obbligatoria: quella dei progetti esistenti resta come «Fine
  pianificata», facoltativa, nella vista avanzata e nella cronologia; i giorni tra il lavoro del
  team e la fine pianificata restano nella barra.
- «Colora per» non c'è più sotto la roadmap, e con lui la barra di 4 px accanto al nome: il colore
  del valore è ora quello della barra del progetto, per tutti, con l'impostazione «Colori dei
  progetti».
- «Team impattati» non è più tra i campi predefiniti: i team di un progetto sono quelli con dei
  giorni uomo. In un'istanza esistente il campo resta finché non lo si elimina da Impostazioni →
  Roadmap.

## [0.10.3] - 2026-10-12

### Aggiunto

- Nella guida "Configura la tua istanza" il riquadro «Dove:» di ogni passo mostra il marchio del
  servizio, Firebase, Google Cloud o GitHub, accanto al suo nome.

### Modificato

- Guida "Configura la tua istanza": ogni passo dice il percorso completo nella console, a partire
  dalla console stessa e dal menu a sinistra (per esempio «Sicurezza → Authentication →
  Impostazioni → Domini autorizzati»), non solo la voce finale. Il passo «Autorizza il dominio del
  sito» dice di incollare solo il nome del dominio, senza `https://`, barra finale o `/*`, e che
  vale subito, senza ripubblicare.
- Guida "Configura la tua istanza", percorso «Progetto esistente»: il passo «Crea una chiave API
  dedicata» è segnato come consigliato, non obbligatorio, con un approfondimento su cosa cambia se
  lo si salta (il sito funziona con la chiave del `firebaseConfig`; restano l'accoppiamento con le
  altre app e le API aperte a chi legge la chiave). I passi seguono il pannello «Crea chiave API»
  della console, una sezione per punto e nel suo ordine: nome, le quattro API in «Seleziona
  limitazioni dell'API», «Siti web», le due voci con un avviso ben visibile sul `/*` finale (senza,
  l'accesso con GitHub, che passa da un'altra pagina dell'`authDomain`, viene rifiutato), «Crea» e
  «Mostra chiave». Il passo «Imposta le variabili del sito» dice che `VITE_FIREBASE_API_KEY` è la
  chiave dedicata copiata con «Mostra chiave», o l'`apiKey` se quel passo è stato saltato.

## [0.10.2] - 2026-10-08

### Modificato

- La guida `docs/ISTANZA-101.md` usa HTTPS come indirizzo del proprio repository e spiega il token
  che il primo push chiede al posto della password (o GitHub CLI); SSH è l'alternativa, con la
  chiave da registrare e il passaggio dalla porta 443 quando la rete chiude la 22. Tra i problemi
  comuni: il push che va in timeout, «Permission denied (publickey)» e la password rifiutata via
  HTTPS.

## [0.10.1] - 2026-10-08

### Aggiunto

- La guida `docs/ISTANZA-101.md` per chi ha una copia propria di Release Board: i concetti di Git
  che servono spiegati da zero (repository, commit, tag, remote, `fetch` e `merge`), cosa è
  dell'istanza e cosa del codice, i due modi di creare l'istanza (clone del repository pubblico,
  consigliato, o copia dei file), come aggiornarla a ogni versione, come trasformare una copia in
  un clone e i problemi comuni.
- Lo script `scripts/update-from-release.sh`, per una copia nata da un incolla: specchia i file di
  una versione pubblicata (l'ultima, o quella chiesta) sulla cartella della copia, toglie i file
  che la versione non ha più e lascia stare ciò che è dell'istanza (`.git`, `node_modules`,
  `dist`, `.env*`, cache, e i pattern di `.update-ignore`). Parte solo da un repository senza
  modifiche in sospeso, ha `--dry-run` e non fa commit.

### Modificato

- Il README manda alla guida per pubblicare la propria copia e dice che un fork resta pubblico:
  per un'istanza privata si fa un clone.

## [0.10.0] - 2026-10-08

### Aggiunto

- «Mostra N giorni», la quinta vista di Next Releases e Roadmap, dopo «Trimestre». Finché è attiva
  un'altra vista, la voce dice quanti giorni interi la finestra mostra con quella vista, e si
  aggiorna quando la finestra cambia; scegliendola, esattamente quei giorni riempiono la finestra,
  senza giorni tagliati ai bordi. Il numero si cambia nella casella dentro la voce, da 7 a quanti
  giorni entrano con 8 px l'uno: resta anche quando la finestra viene ridimensionata, e i giorni
  si adattano. Sotto i 20 px per giorno le colonne diventano settimane, come in «Trimestre». Il
  browser ricorda la vista e il numero per ciascuna area. Ctrl + rotellina e il pizzico, da questa
  vista, tornano alla vista fissa più vicina.
- Roadmap (funzione beta): «Colora per», sotto la roadmap accanto a «Raggruppa per». Una barra di
  4 px a sinistra del nome di ogni progetto prende il colore del valore che il progetto ha per una
  lista di valori esclusivi con dei colori: di serie la prima, cioè «Dimensione»; «Nessun colore»
  la toglie. La scelta resta nel browser. Il nome del valore c'è sempre: nell'etichetta sotto il
  titolo, nell'intestazione del gruppo o, al livello «Solo titoli», per lo screen reader.
- Nell'ultima riga della roadmap un pulsante «Nuovo progetto», che crea un progetto da oggi o dal
  mese in vista come il pulsante in alto; i giorni della riga continuano a creare un progetto da
  quel giorno, con il «+» al passaggio del mouse. Non c'è più la frase da leggere.

### Modificato

- La colonna dei progetti, ai livelli «Info principali» e «Team», è più larga e più ordinata:
  sotto il titolo una riga in grigio con stato, mesi (con l'icona del calendario) e responsabile;
  la descrizione su due righe (una in modalità compatta), intera al passaggio del mouse; poi i
  campi principali, staccati: un valore solo resta accanto alla sua etichetta, una lista ha
  l'etichetta sopra e i valori sotto, così le etichette di «Team impattati» non restano sole con la
  prima.
- «Raggruppa per» e «Colora per» restano visibili anche senza un campo adatto, disattivati, e il
  loro titolo dice dove crearne uno.
- Intestazioni e misure del calendario seguono la larghezza del giorno, non più il nome della
  vista: sotto i 20 px per giorno colonne di una settimana e barre alte una riga, sotto i 40 px le
  iniziali dei giorni e le note come icone.

## [0.9.0] - 2026-10-06

### Aggiunto

- Roadmap (funzione beta): «Raggruppa per», sotto la roadmap, mette insieme i progetti con lo
  stesso valore di un campo, sotto un'intestazione con il valore come etichetta e il numero dei
  progetti. I gruppi seguono l'ordine dei valori del campo e in fondo vengono i progetti senza
  valore; il campo del gruppo non si ripete sotto i progetti. La scelta resta nel browser.
- La proprietà `group` («Raggruppa») dei campi dei progetti, in Impostazioni → Roadmap → «Modifica
  i campi…»: vale per le liste di valori esclusivi, così ogni progetto sta in un gruppo solo. Il
  nuovo campo predefinito «Dimensione», con «Big project», «Medium project» e «Small project», la
  ha di serie.
- Un colore per ogni valore di una lista, scelto tra quelli delle attività, leggibili in ogni tema,
  con l'anteprima dell'etichetta nell'editor del campo. I valori predefiniti di «Team impattati»
  hanno i colori dei team.

### Modificato

- Sotto il titolo dei progetti, ai livelli «Info principali» e «Team», i valori delle liste e i
  testi multipli sono etichette, rettangoli arrotondati nei colori dei valori o neutri; i link
  stanno uno accanto all'altro e il resto resta testo. Il nome dice sempre il valore: il colore
  aiuta solo a riconoscerlo.
- Nella finestra del progetto i valori delle liste sono le stesse etichette, e una lista di valori
  esclusivi si sceglie con i pulsanti di opzione invece che da un menu.
- La cronologia mostra i valori di una lista con i loro colori.
- Nell'istanza condivisa servono le regole di Firestore nuove (la chiave `group` dei campi):
  senza, un campo che raggruppa non si salva. Un piano già creato non riceve da solo il campo
  «Dimensione»: si aggiunge in Impostazioni → Roadmap → «Modifica i campi…», oppure si riportano i
  predefiniti.

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

[Unreleased]: https://github.com/stangoldbear/release-board/compare/v0.22.0...HEAD
[0.22.0]: https://github.com/stangoldbear/release-board/compare/v0.21.0...v0.22.0
[0.21.0]: https://github.com/stangoldbear/release-board/compare/v0.20.0...v0.21.0
[0.20.0]: https://github.com/stangoldbear/release-board/compare/v0.19.0...v0.20.0
[0.19.0]: https://github.com/stangoldbear/release-board/compare/v0.18.0...v0.19.0
[0.18.0]: https://github.com/stangoldbear/release-board/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/stangoldbear/release-board/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/stangoldbear/release-board/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/stangoldbear/release-board/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/stangoldbear/release-board/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/stangoldbear/release-board/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/stangoldbear/release-board/compare/v0.11.1...v0.12.0
[0.11.1]: https://github.com/stangoldbear/release-board/compare/v0.10.3...v0.11.1
[0.10.3]: https://github.com/stangoldbear/release-board/compare/v0.10.2...v0.10.3
[0.10.2]: https://github.com/stangoldbear/release-board/compare/v0.10.1...v0.10.2
[0.10.1]: https://github.com/stangoldbear/release-board/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/stangoldbear/release-board/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/stangoldbear/release-board/compare/v0.8.0...v0.9.0
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
