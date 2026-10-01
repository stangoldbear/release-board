import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { FIREBASE_ENV_VARS } from '../../infra/firebase/config';
import { CopyButton } from '../../shared/ui/CopyButton';
import rules from '../../../firestore/firestore.rules?raw';

/** Whether the guide sets up a new Firebase project or one that is already in use. */
export type ProjectKind = 'new' | 'existing';

export type StepId =
  | 'createProject'
  | 'createDatabase'
  | 'checkDatabase'
  | 'convertDatabase'
  | 'enableGitHub'
  | 'createOAuthApp'
  | 'saveGitHubCredentials'
  | 'authorizeDomain'
  | 'registerWebApp'
  | 'createApiKey'
  | 'publishRules'
  | 'setVariables'
  | 'redeploy';

/** The site where a step is done, and the page of it where the step starts. */
export interface Place {
  name: string;
  url: string;
}

/** What the steps need to know about this copy of the app and about the guide they belong to. */
export interface StepContext {
  kind: ProjectKind;
  /** Host name of this site: the domain to authorize, and the site the API key accepts. */
  host: string;
  /** Address of this site: the homepage of the OAuth app. */
  siteUrl: string;
  /** The number of another step of the same guide, to refer to it. */
  stepNumber: (id: StepId) => number;
}

export interface GuideStep {
  title: string;
  place: Place;
  content: (context: StepContext) => ReactNode;
}

const FIREBASE_CONSOLE: Place = {
  name: 'console Firebase',
  url: 'https://console.firebase.google.com/',
};
const CLOUD_DATABASES: Place = {
  name: 'console Google Cloud',
  url: 'https://console.cloud.google.com/firestore/databases',
};
const CLOUD_CREDENTIALS: Place = {
  name: 'console Google Cloud',
  url: 'https://console.cloud.google.com/apis/credentials',
};
const GITHUB_OAUTH_APPS: Place = { name: 'GitHub', url: 'https://github.com/settings/developers' };
const GITHUB: Place = { name: 'GitHub', url: 'https://github.com/' };

const APP_ENGINE_PAGE = 'https://console.cloud.google.com/appengine';

/** Turns the empty Datastore mode database of a project into one that this app can use. */
const CONVERT_COMMAND =
  "gcloud firestore databases update --database='(default)' --type=firestore-native";
const DELETE_COMMAND = "gcloud firestore databases delete --database='(default)'";
const UNPROTECT_COMMAND =
  "gcloud firestore databases update --database='(default)' --no-delete-protection";

/** The field of `firebaseConfig` that holds the value of each repository variable. */
const CONFIG_FIELDS: Record<(typeof FIREBASE_ENV_VARS)[number], string> = {
  VITE_FIREBASE_API_KEY: 'apiKey',
  VITE_FIREBASE_AUTH_DOMAIN: 'authDomain',
  VITE_FIREBASE_PROJECT_ID: 'projectId',
  VITE_FIREBASE_APP_ID: 'appId',
};

/** The actions of a step, in order. */
function Actions({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-1.5 pl-5 marker:text-fg-muted">{children}</ol>;
}

/** The cases a step tells apart. */
function Cases({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-xs text-fg-muted">{children}</p>;
}

/** Background and consequences of a step, closed until the reader asks for them. */
function More({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-line bg-surface-muted">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs font-semibold text-link [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        Approfondimento: {title}
      </summary>
      <div className="space-y-2 border-t border-line px-3 py-2.5 text-sm">{children}</div>
    </details>
  );
}

/** A value to type somewhere else, with its copy button. */
function CopyValue({ value, confirmation }: { value: string; confirmation: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2 align-middle">
      <code>{value}</code>
      <CopyButton text={value} confirmation={confirmation} />
    </span>
  );
}

/** A command for Cloud Shell, with its copy button. */
function Command({ command }: { command: string }) {
  return (
    <div className="flex items-start gap-2">
      <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-surface-strong px-2.5 py-1.5 font-mono text-xs text-fg">
        {command}
      </pre>
      <CopyButton text={command} confirmation="Comando copiato" />
    </div>
  );
}

/** Where the plan's data lives, and what the choice changes for a team in Italy. */
function LocationMore({ kind, stepNumber }: StepContext) {
  return (
    <More title="quale località scegliere, nam5 o Europa">
      <p>
        La località decide dove stanno attività, note e valori del piano, e quanta strada fanno le
        richieste. Non si cambia dopo la creazione.
      </p>
      <Cases>
        <li>
          <strong>europe-west8</strong> (Milano, una regione): la più vicina a chi lavora in Italia,
          con i dati in Italia. È la scelta consigliata per un team italiano.
        </li>
        <li>
          <strong>eur3</strong> (Europa, più regioni: Belgio e Paesi Bassi): dati in Europa e
          disponibilità più alta, con tempi di risposta di poco superiori a Milano.
        </li>
        <li>
          <strong>nam5</strong> (Stati Uniti, più regioni: Iowa e Oklahoma): dall'Italia ogni
          scambio con il server richiede circa un decimo di secondo in più. L'app resta usabile,
          perché le modifiche compaiono subito sul tuo schermo e arrivano agli altri poco dopo, ma i
          dati del piano stanno negli Stati Uniti.
        </li>
      </Cases>
      <p>
        La quota gratuita del piano Spark vale per il database <code>(default)</code> in qualsiasi
        località. Gli account di accesso (Authentication) stanno comunque negli Stati Uniti: la
        località riguarda solo il contenuto del piano. Se l'azienda chiede che i dati restino in
        Europa, scegli una località europea e chiedi conferma a chi si occupa di privacy.
      </p>
      {kind === 'existing' && (
        <>
          <p className="font-semibold">Database vuoto in nam5: portarlo in Europa</p>
          <p>
            Un database non si sposta: si cancella e si ricrea, e si può fare solo finché è vuoto.
            Vale anche se l'hai già convertito in «Firestore nativo».
          </p>
          <Actions>
            <li>
              Controlla che il progetto non abbia un'app App Engine: apri la{' '}
              <a
                href={APP_ENGINE_PAGE}
                target="_blank"
                rel="noreferrer"
                className="text-link underline"
              >
                pagina App Engine
              </a>{' '}
              della console Google Cloud. Se ti propone di creare un'applicazione, il progetto non
              ne ha: non crearla. Se un'app c'è, la località del database <code>(default)</code> è
              legata alla sua: resta su nam5.
            </li>
            <li className="space-y-2">
              <p>
                In Cloud Shell cancella il database vuoto. Usa il comando solo se al passo{' '}
                {stepNumber('checkDatabase')} il database è risultato vuoto.
              </p>
              <Command command={DELETE_COMMAND} />
              <p>Se risponde che il database è protetto dall'eliminazione, prima esegui:</p>
              <Command command={UNPROTECT_COMMAND} />
            </li>
            <li>
              Aspetta almeno cinque minuti: prima l'ID <code>(default)</code> non si può riusare.
            </li>
            <li>
              Dalla console Firebase crea il database con{' '}
              <strong>Firestore Database → Crea database</strong>: edizione Standard, ID{' '}
              <code>(default)</code>, località <code>europe-west8</code>, modalità di produzione.
              Nasce già in «Firestore nativo»: salta il passo {stepNumber('convertDatabase')} e vai
              al passo {stepNumber('enableGitHub')}. Se la console non ti lascia scegliere una
              località europea, crealo in nam5: funziona allo stesso modo.
            </li>
          </Actions>
          <p>
            Se preferisci non toccare nulla, nam5 va bene: converti il database al passo{' '}
            {stepNumber('convertDatabase')}.
          </p>
        </>
      )}
    </More>
  );
}

const STEPS: Record<StepId, GuideStep> = {
  createProject: {
    title: 'Crea il progetto',
    place: FIREBASE_CONSOLE,
    content: () => (
      <>
        <Actions>
          <li>Nella pagina iniziale scegli di creare un nuovo progetto.</li>
          <li>
            Scrivi il nome, per esempio <code>Release Board</code>, e premi{' '}
            <strong>Continua</strong>.
          </li>
          <li>
            Nelle pagine successive spegni le opzioni facoltative, compreso{' '}
            <strong>Google Analytics</strong>: non servono. Poi premi <strong>Crea progetto</strong>
            .
          </li>
        </Actions>
        <Note>
          Se <strong>Continua</strong> resta disattivato, il tuo account non può creare progetti
          nell'organizzazione Google Cloud: chiedi il ruolo <strong>Project Creator</strong> a chi
          la amministra, oppure scegli «Ho già un progetto» e usa un progetto esistente.
        </Note>
      </>
    ),
  },
  createDatabase: {
    title: 'Crea il database',
    place: FIREBASE_CONSOLE,
    content: (context) => (
      <>
        <Actions>
          <li>
            Nel menu a sinistra scegli <strong>Firestore Database</strong> e premi{' '}
            <strong>Crea database</strong>.
          </li>
          <li>
            Scegli l'edizione <strong>Standard</strong> e lascia l'ID <code>(default)</code>.
          </li>
          <li>
            Scegli la località: per un team in Italia <code>europe-west8</code> (Milano). Non si
            potrà cambiare.
          </li>
          <li>
            Scegli <strong>Avvia in modalità di produzione</strong> e premi <strong>Crea</strong>.
          </li>
        </Actions>
        <LocationMore {...context} />
      </>
    ),
  },
  checkDatabase: {
    title: 'Controlla il database',
    place: CLOUD_DATABASES,
    content: (context) => {
      const { stepNumber } = context;
      return (
        <>
          <Actions>
            <li>
              Apri la pagina dal link qui sopra e scegli il progetto nel selettore in alto: ha lo
              stesso nome che nella console Firebase.
            </li>
            <li>
              Cerca la riga con ID <code>(default)</code>, guarda le colonne{' '}
              <strong>Modalità</strong> e <strong>Località</strong> e apri il database per vedere se
              contiene dati.
            </li>
          </Actions>
          <p>Poi, secondo quello che trovi:</p>
          <Cases>
            <li>
              <strong>«Firestore nativo», vuoto</strong>: è già pronto. Passa al passo{' '}
              {stepNumber('enableGitHub')}.
            </li>
            <li>
              <strong>«Firestore con compatibilità Datastore», vuoto</strong>: va convertito al
              passo {stepNumber('convertDatabase')}.
            </li>
            <li>
              <strong>
                Nessuna riga <code>(default)</code>
              </strong>
              : crealo dalla console Firebase con{' '}
              <strong>Firestore Database → Crea database</strong>: edizione Standard, ID{' '}
              <code>(default)</code>, una località in Europa, modalità di produzione. Poi passa al
              passo {stepNumber('enableGitHub')}.
            </li>
            <li>
              <strong>Contiene dati</strong>, in qualsiasi modalità: lo usa già un'altra app.
              Fermati qui: le regole di sicurezza di Release Board valgono per tutto il database e
              bloccherebbero quell'app. Serve un progetto nuovo.
            </li>
          </Cases>
          <More title="le due modalità di Firestore">
            <p>
              «Firestore con compatibilità Datastore» serve ai programmi su server che usano l'API
              Datastore: non ha aggiornamenti in tempo reale né regole di sicurezza per i browser.
              Release Board gira nel browser, si aggiorna in tempo reale e si affida alle regole:
              per questo serve «Firestore nativo».
            </p>
            <p>
              Il piano Spark copre un solo database, <code>(default)</code>. Un secondo database con
              un altro nome eviterebbe di toccarlo, ma richiede la fatturazione (piano Blaze), e
              Release Board oggi usa solo <code>(default)</code>.
            </p>
          </More>
          <LocationMore {...context} />
        </>
      );
    },
  },
  convertDatabase: {
    title: 'Converti il database in «Firestore nativo»',
    place: CLOUD_DATABASES,
    content: ({ stepNumber }) => (
      <>
        <p>
          Solo se al passo {stepNumber('checkDatabase')} il database era «Firestore con
          compatibilità Datastore» e vuoto; altrimenti passa al passo {stepNumber('enableGitHub')}.
        </p>
        <Actions>
          <li>
            Nella stessa pagina apri <code>(default)</code>: con il database vuoto compare un
            pulsante per cambiarne la modalità. Premilo e conferma.
          </li>
          <li className="space-y-2">
            <p>
              Se il pulsante non c'è, apri <strong>Cloud Shell</strong> con l'icona{' '}
              <code>&gt;_</code> in alto a destra: in fondo alla pagina si apre un terminale.
              Incolla questo comando, premi Invio e conferma se te lo chiede.
            </p>
            <Command command={CONVERT_COMMAND} />
          </li>
          <li>
            Aspetta qualche minuto e ricarica l'elenco dei database: la modalità di{' '}
            <code>(default)</code> diventa «Firestore nativo».
          </li>
        </Actions>
        <More title="cosa succede con la conversione">
          <p>
            Cambia solo la modalità: ID, località e permessi restano gli stessi. Per qualche minuto
            il database rifiuta le scritture, ma è vuoto e nessuno lo usa.
          </p>
          <p>
            Si converte solo un database vuoto, e finché resta vuoto si torna indietro con lo stesso
            comando e <code>--type=datastore-mode</code>.
          </p>
          <p>
            Cloud Shell è un terminale nel browser, già collegato al tuo account e al progetto
            scelto in alto: non installa nulla sul tuo computer e non costa nulla.
          </p>
        </More>
      </>
    ),
  },
  enableGitHub: {
    title: 'Attiva il provider GitHub',
    place: FIREBASE_CONSOLE,
    content: ({ kind, stepNumber }) => (
      <>
        <Actions>
          <li>
            Apri il progetto e nel menu a sinistra scegli <strong>Authentication</strong>. Se è la
            prima volta, premi <strong>Inizia</strong>.
          </li>
          <li>
            Nella scheda <strong>Metodo di accesso</strong> premi{' '}
            <strong>Aggiungi nuovo provider</strong> e scegli <strong>GitHub</strong>.
          </li>
          <li>
            Attiva l'interruttore <strong>Abilita</strong>. Per ora lascia vuoti Client ID e Client
            secret: li crei su GitHub al passo {stepNumber('createOAuthApp')}.
          </li>
          <li>
            Copia l'<strong>URL di callback</strong> che la finestra mostra in basso: finisce con{' '}
            <code>/__/auth/handler</code>. Su GitHub lo incollerai come{' '}
            <strong>Redirect URI</strong>. Lascia la finestra aperta.
          </li>
        </Actions>
        {kind === 'existing' && (
          <Note>
            I provider già attivi restano come sono. Se le altre app usano Authentication, chi entra
            in Release Board compare nello stesso elenco di utenti: il piano resta visibile solo ai
            membri invitati.
          </Note>
        )}
        <More title="cosa cambia in Authentication">
          <p>
            Attivare GitHub aggiunge un modo di entrare: i provider già attivi e i loro utenti
            restano come sono.
          </p>
          <p>
            Chi entra in Release Board compare in <strong>Authentication → Utenti</strong> con il
            provider GitHub. Firebase conserva id GitHub, email, nome e avatar; lo username GitHub
            lo ricava l'app al primo accesso, e se non ci riesce lo chiede.
          </p>
          <p>
            Con l'impostazione predefinita un indirizzo email corrisponde a un solo account: chi ha
            già un account nel progetto con la stessa email ma un altro provider non riesce a
            entrare con GitHub, e l'app glielo dice.
          </p>
          <p>
            Gli account di Authentication sono conservati negli Stati Uniti, qualunque sia la
            località del database.
          </p>
        </More>
      </>
    ),
  },
  createOAuthApp: {
    title: "Crea l'app OAuth",
    place: GITHUB_OAUTH_APPS,
    content: ({ siteUrl, stepNumber }) => (
      <>
        <Actions>
          <li>
            Scegli dove crearla, leggendo l'approfondimento qui sotto:
            <Cases>
              <li>
                nel tuo account: menu del tuo avatar →{' '}
                <strong>Settings → Developer settings → OAuth Apps</strong> (il link qui sopra porta
                lì);
              </li>
              <li>
                in un'organizzazione di cui sei amministratore: pagina dell'organizzazione →{' '}
                <strong>Settings → Developer settings → OAuth Apps</strong>.
              </li>
            </Cases>
          </li>
          <li>
            Premi <strong>New OAuth App</strong> (in un'organizzazione{' '}
            <strong>New Org OAuth App</strong>; se l'elenco è vuoto,{' '}
            <strong>Register a new application</strong>): si apre il modulo{' '}
            <strong>Register a new OAuth app</strong>.
          </li>
          <li>
            <strong>Application name</strong>: <code>Release Board</code>.
          </li>
          <li>
            <strong>Homepage URL</strong>: l'indirizzo di questo sito,{' '}
            <CopyValue value={siteUrl} confirmation="Indirizzo copiato" />
          </li>
          <li>
            <strong>Application description</strong>: facoltativa. Per esempio{' '}
            <code>Calendario dei rilasci del team</code>.
          </li>
          <li>
            Nella sezione <strong>Redirect URIs</strong>, nel campo <strong>Redirect URI</strong>{' '}
            incolla l'URL di callback copiato al passo {stepNumber('enableGitHub')}. Ne basta uno:
            non premere <strong>Add redirect URI</strong> e lascia spento{' '}
            <strong>Allow wildcard matching</strong>.
          </li>
          <li>
            Lascia le due opzioni come le propone GitHub: <strong>Enable Device Flow</strong>{' '}
            spento, <strong>Expire user access tokens</strong> attivo.
          </li>
          <li>
            Premi <strong>Register application</strong>.
          </li>
          <li>
            Nella pagina dell'app copia il <strong>Client ID</strong>. Poi, alla voce{' '}
            <strong>Client secrets</strong>, premi <strong>Generate a new client secret</strong> e
            copia il secret: GitHub lo mostra una volta sola.
          </li>
        </Actions>
        <More title="i campi del modulo di GitHub">
          <Cases>
            <li>
              <strong>Homepage URL</strong> e <strong>Application description</strong>: compaiono
              nella pagina in cui un collega autorizza l'app, non cambiano il funzionamento.
            </li>
            <li>
              <strong>Redirect URI</strong>: l'indirizzo a cui GitHub rimanda il browser dopo
              l'autorizzazione. Deve essere quello di Firebase, che riceve la risposta, verifica
              l'identità e apre la sessione. Firebase lo chiama «URL di callback», GitHub «Redirect
              URI»: sono la stessa cosa. Se non coincide, GitHub mostra un errore su{' '}
              <code>redirect_uri</code>.
            </li>
            <li>
              <strong>Add redirect URI</strong>: serve solo se la stessa app deve rimandare a più
              indirizzi, fino a dieci. Per Release Board basta quello di Firebase.
            </li>
            <li>
              <strong>Allow wildcard matching</strong>: accetterebbe anche altri sottodomini e
              percorsi dello stesso indirizzo. Spento, GitHub rimanda solo all'indirizzo esatto, e
              nessun altro sito può ricevere gli accessi.
            </li>
            <li>
              <strong>Enable Device Flow</strong>: accesso con un codice da digitare, per
              dispositivi senza browser come la riga di comando. Release Board non lo usa.
            </li>
            <li>
              <strong>Expire user access tokens</strong>: il token che GitHub consegna a Firebase
              scade dopo otto ore e si rinnova con un <code>refresh_token</code>. Release Board lo
              usa solo nel momento dell'accesso, poi la sessione la tiene Firebase: attivo è più
              sicuro e per chi usa l'app non cambia nulla.
            </li>
            <li>
              <strong>Client ID</strong> e <strong>Client secret</strong>: identificano l'app e ne
              provano la proprietà quando Firebase completa l'accesso. Il Client ID non è segreto;
              il secret sì, e sta solo in Firebase.
            </li>
          </Cases>
        </More>
        <More title="app del tuo account o dell'organizzazione?">
          <p>Per l'accesso funzionano allo stesso modo: cambia chi può gestire l'app.</p>
          <p className="font-semibold">Nel tuo account (New OAuth App)</p>
          <Cases>
            <li>La crei subito, senza permessi sull'organizzazione.</li>
            <li>
              Solo tu puoi modificarla, rigenerare il secret o cancellarla. Se lasci l'azienda o il
              tuo account viene chiuso, nessun altro può gestirla, e cancellarla blocca l'accesso a
              tutto il team.
            </li>
            <li>
              Al primo accesso GitHub chiede a ogni collega di autorizzare «Release Board» e mostra
              il tuo account come proprietario.
            </li>
          </Cases>
          <p className="font-semibold">Nell'organizzazione (New Org OAuth App)</p>
          <Cases>
            <li>Serve essere amministratore dell'organizzazione.</li>
            <li>
              La gestiscono gli amministratori: l'accesso del team non dipende da una sola persona.
            </li>
            <li>
              La richiesta di autorizzazione mostra il nome dell'organizzazione, più riconoscibile
              per i colleghi.
            </li>
          </Cases>
          <p>
            In entrambi i casi Release Board riceve solo profilo ed email di chi entra: non vede
            repository né dati dell'organizzazione, e le restrizioni dell'organizzazione sulle app
            OAuth non bloccano l'accesso.
          </p>
          <p>
            Puoi partire dal tuo account e passarla all'organizzazione più tardi: nella pagina
            dell'app premi <strong>Transfer ownership</strong> e un amministratore
            dell'organizzazione completa il trasferimento. L'app resta la stessa, con lo stesso
            Client ID: in Firebase non c'è niente da cambiare.
          </p>
        </More>
      </>
    ),
  },
  saveGitHubCredentials: {
    title: 'Completa il provider GitHub',
    place: FIREBASE_CONSOLE,
    content: ({ stepNumber }) => (
      <>
        <Actions>
          <li>
            Torna alla finestra del provider GitHub lasciata aperta al passo{' '}
            {stepNumber('enableGitHub')}. Se l'hai chiusa, riaprila da{' '}
            <strong>Authentication → Metodo di accesso</strong>.
          </li>
          <li>
            Incolla <strong>Client ID</strong> e <strong>Client secret</strong> e premi{' '}
            <strong>Salva</strong>.
          </li>
        </Actions>
        <More title="se il secret viene esposto">
          <p>
            Il secret permette a Firebase di completare l'accesso con GitHub: serve solo qui, non va
            messo nel repository né nelle variabili del sito.
          </p>
          <p>
            Se finisce dove non deve, su GitHub generane uno nuovo, incollalo qui e salva, poi
            cancella il vecchio: da quel momento il vecchio non funziona più.
          </p>
        </More>
      </>
    ),
  },
  authorizeDomain: {
    title: 'Autorizza il dominio del sito',
    place: FIREBASE_CONSOLE,
    content: ({ kind, host }) => (
      <>
        <Actions>
          <li>
            In <strong>Authentication</strong> apri la scheda <strong>Impostazioni</strong>, poi{' '}
            <strong>Domini autorizzati</strong>, e premi <strong>Aggiungi dominio</strong>.
          </li>
          <li>
            Incolla il dominio di questo sito,{' '}
            <CopyValue value={host} confirmation="Dominio copiato" />, e premi{' '}
            <strong>Aggiungi</strong>.
          </li>
        </Actions>
        {kind === 'existing' && (
          <Note>Non togliere i domini che ci sono già: servono alle altre app.</Note>
        )}
        <More title="perché autorizzare il dominio">
          <p>
            Firebase apre la finestra di accesso solo dai domini di questo elenco:{' '}
            <code>localhost</code> e i domini del progetto ci sono già.
          </p>
          <p>
            Su GitHub Pages pubblico il dominio è lo stesso per tutti i siti di un account o di
            un'organizzazione (per esempio <code>nome.github.io</code>): autorizzarlo vale per tutti
            quei siti. Anche se un altro di loro usasse l'accesso del progetto, non leggerebbe il
            piano: lo proteggono le regole.
          </p>
        </More>
      </>
    ),
  },
  registerWebApp: {
    title: "Registra l'app web",
    place: FIREBASE_CONSOLE,
    content: ({ kind, stepNumber }) => (
      <>
        <Actions>
          <li>
            Premi l'ingranaggio accanto a <strong>Panoramica del progetto</strong> e scegli{' '}
            <strong>Impostazioni progetto</strong>.
          </li>
          <li>
            Nella scheda <strong>Generali</strong>, alla voce <strong>Le tue app</strong> in fondo
            alla pagina, scegli l'icona <strong>Web</strong> (<code>&lt;/&gt;</code>). Se il
            progetto ha già delle app, prima premi <strong>Aggiungi app</strong>.
          </li>
          <li>
            Nickname: <code>Release Board</code>. Lascia spenta l'opzione di{' '}
            <strong>Firebase Hosting</strong> e premi <strong>Registra app</strong>.
          </li>
          <li>
            Compare un blocco di codice con <code>firebaseConfig</code>: i suoi valori servono
            {kind === 'existing' ? ` ai passi ${stepNumber('createApiKey')} e ` : ' al passo '}
            {stepNumber('setVariables')}. Lo ritrovi in qualsiasi momento in questa pagina, sotto
            l'app web.
          </li>
        </Actions>
        {kind === 'existing' && (
          <Note>
            Le app già registrate, per esempio quelle iOS e Android, restano come sono. Il valore{' '}
            <code>measurementId</code>, se c'è, non serve.
          </Note>
        )}
        <More title="cosa crea">
          <p>
            Una voce «app web» con il suo <code>appId</code>, che permette a Firebase di riconoscere
            il sito. Le app già registrate non cambiano.
          </p>
          <p>
            Se nel progetto è attivo Google Analytics, Firebase può associare all'app un{' '}
            <code>measurementId</code>: Release Board non lo usa e non invia dati ad Analytics.
          </p>
          <p>
            I valori di <code>firebaseConfig</code> finiscono nel codice del sito: non sono segreti.
            I dati li proteggono le regole di sicurezza.
          </p>
        </More>
      </>
    ),
  },
  createApiKey: {
    title: 'Crea una chiave API dedicata',
    place: CLOUD_CREDENTIALS,
    content: ({ host, stepNumber }) => (
      <>
        <Actions>
          <li>
            Apri la pagina dal link qui sopra, <strong>API e servizi → Credenziali</strong>, con il
            progetto scelto nel selettore in alto.
          </li>
          <li>
            Premi <strong>Crea credenziali</strong> e scegli <strong>Chiave API</strong>. Se la
            chiave viene creata subito, aprila dall'elenco per impostarla.
          </li>
          <li>
            Nome: <code>Release Board web</code>.
          </li>
          <li>
            In <strong>Restrizioni delle applicazioni</strong> scegli <strong>Siti web</strong> e
            aggiungi due voci: <CopyValue value={`https://${host}/*`} confirmation="Voce copiata" />{' '}
            e l'<code>authDomain</code> del <code>firebaseConfig</code> (passo{' '}
            {stepNumber('registerWebApp')}) nello stesso formato, per esempio{' '}
            <code>https://mio-progetto.firebaseapp.com/*</code>.
          </li>
          <li>
            In <strong>Restrizioni delle API</strong> scegli <strong>Limita chiave</strong> e
            seleziona <strong>Identity Toolkit API</strong>, <strong>Token Service API</strong>,{' '}
            <strong>Cloud Firestore API</strong> e <strong>Cloud Datastore API</strong>. Premi{' '}
            <strong>Salva</strong>.
          </li>
          <li>
            Nell'elenco premi <strong>Mostra chiave</strong> e copiala: va nelle variabili del sito
            al passo {stepNumber('setVariables')}, al posto dell'<code>apiKey</code> del{' '}
            <code>firebaseConfig</code>.
          </li>
        </Actions>
        <Note>Non modificare le chiavi che c'erano già: le usano le altre app.</Note>
        <More title="perché una chiave dedicata">
          <p>
            La chiave identifica il progetto, non dà accesso ai dati: quello lo decidono le regole.
          </p>
          <p>
            Le chiavi create da Firebase servono anche alle app iOS e Android: se le limitassi al
            dominio del sito, quelle app smetterebbero di funzionare. Una chiave dedicata tiene
            separati il sito e le app.
          </p>
          <p>
            Le restrizioni dei siti valgono per i browser: un programma può dichiarare un sito
            falso. Sono una difesa in più, non la protezione principale.
          </p>
          <p>
            Le API scelte sono quelle che usa il sito: Identity Toolkit e Token Service per
            l'accesso, Cloud Firestore e Cloud Datastore per il database. Se dopo la pubblicazione
            l'accesso non riesce per colpa della chiave, l'app dice quale restrizione controllare.
          </p>
        </More>
      </>
    ),
  },
  publishRules: {
    title: 'Pubblica le regole di sicurezza',
    place: FIREBASE_CONSOLE,
    content: ({ kind, stepNumber }) => (
      <>
        <Actions>
          <li>
            Nel menu a sinistra scegli <strong>Firestore Database</strong> e apri la scheda{' '}
            <strong>Regole</strong>.
          </li>
          <li>
            Sostituisci tutto il testo con queste regole{' '}
            <CopyButton text={rules} label="Copia regole" confirmation="Regole copiate" /> e premi{' '}
            <strong>Pubblica</strong>.
          </li>
        </Actions>
        <Note>
          Con queste regole solo i membri invitati leggono e modificano il piano.
          {kind === 'existing' && (
            <>
              {' '}
              Valgono per tutto il database <code>(default)</code>: per questo al passo{' '}
              {stepNumber('checkDatabase')} doveva risultare libero.
            </>
          )}
        </Note>
        <More title="cosa fanno le regole">
          <p>
            Solo i membri del piano leggono e modificano i dati; chi entra senza invito non vede
            nulla.
          </p>
          <p>
            Ogni modifica porta autore, ora e una voce di cronologia, e i dati vengono controllati:
            date, lunghezza dei testi, stati e colori ammessi.
          </p>
          <p>
            Valgono per tutto il database: qualsiasi altra raccolta resta chiusa. Per questo il
            database deve servire solo a Release Board.
          </p>
          <p>
            Le regole sono anche nel repository, in <code>firestore/firestore.rules</code>: se una
            versione nuova le cambia, il changelog lo dice e vanno pubblicate di nuovo.
          </p>
        </More>
      </>
    ),
  },
  setVariables: {
    title: 'Imposta le variabili del sito',
    place: GITHUB,
    content: ({ kind, stepNumber }) => (
      <>
        <Actions>
          <li>
            Apri il repository che pubblica il sito, poi{' '}
            <strong>Settings → Secrets and variables → Actions</strong> e la scheda{' '}
            <strong>Variables</strong>.
          </li>
          <li>
            Per ogni riga qui sotto premi <strong>New repository variable</strong>, inserisci nome e
            valore e premi <strong>Add variable</strong>. I valori vengono dal{' '}
            <code>firebaseConfig</code> del passo {stepNumber('registerWebApp')}
            {kind === 'existing' && (
              <>, tranne la chiave, che è quella del passo {stepNumber('createApiKey')}</>
            )}
            .
          </li>
        </Actions>
        <ul className="space-y-1.5">
          {FIREBASE_ENV_VARS.map((name) => (
            <li key={name} className="flex flex-wrap items-center gap-2">
              <CopyValue value={name} confirmation="Nome copiato" />
              <span>
                ←{' '}
                {kind === 'existing' && name === 'VITE_FIREBASE_API_KEY' ? (
                  'la chiave API dedicata'
                ) : (
                  <code>{CONFIG_FIELDS[name]}</code>
                )}
              </span>
            </li>
          ))}
        </ul>
        <p>
          Se il repository è privato serve anche{' '}
          <CopyValue value="PAGES_DEPLOY" confirmation="Nome copiato" /> con valore{' '}
          <code>true</code>: senza, il workflow non pubblica il sito.
        </p>
        <More title="dove finiscono questi valori">
          <p>
            Durante la build i quattro valori entrano nel codice del sito: chi apre il sito li può
            leggere. Per questo sono variabili e non secret; i dati li proteggono le regole.
          </p>
          <p>
            Senza le quattro variabili il sito funziona in modalità locale, con i dati nel browser.
            Valgono solo nel repository in cui le metti: un'altra copia del sito resta locale.
          </p>
        </More>
      </>
    ),
  },
  redeploy: {
    title: 'Pubblica di nuovo il sito',
    place: GITHUB,
    content: () => (
      <>
        <Actions>
          <li>
            Nello stesso repository apri la scheda <strong>Actions</strong>, scegli{' '}
            <strong>Deploy Pages</strong> nell'elenco a sinistra e premi{' '}
            <strong>Run workflow</strong>, poi di nuovo <strong>Run workflow</strong> per
            confermare.
          </li>
          <li>
            Quando il workflow è finito, dopo qualche minuto, ricarica il sito: compare il pulsante{' '}
            <strong>Accedi con GitHub</strong>.
          </li>
          <li>
            Entra per primo: il primo accesso crea il piano e ti rende proprietario. Poi invita i
            colleghi da <strong>Impostazioni → Membri</strong>.
          </li>
        </Actions>
        <More title="il primo accesso">
          <p>
            Il primo che entra crea il piano e ne diventa proprietario: fallo tu, prima di
            condividere il link.
          </p>
          <p>Il piano può partire vuoto, dai dati di questo browser o da un backup JSON.</p>
          <p>
            I colleghi si invitano da <strong>Impostazioni → Membri</strong> con il loro username
            GitHub. Chi non è invitato vede un messaggio e nessun dato.
          </p>
        </More>
      </>
    ),
  },
};

/** The steps of each guide, in order. Steps refer to each other by number, through `stepNumber`. */
const GUIDES: Record<ProjectKind, readonly StepId[]> = {
  new: [
    'createProject',
    'createDatabase',
    'enableGitHub',
    'createOAuthApp',
    'saveGitHubCredentials',
    'authorizeDomain',
    'registerWebApp',
    'publishRules',
    'setVariables',
    'redeploy',
  ],
  existing: [
    'checkDatabase',
    'convertDatabase',
    'enableGitHub',
    'createOAuthApp',
    'saveGitHubCredentials',
    'authorizeDomain',
    'registerWebApp',
    'createApiKey',
    'publishRules',
    'setVariables',
    'redeploy',
  ],
};

export function stepsFor(kind: ProjectKind): readonly GuideStep[] {
  return GUIDES[kind].map((id) => STEPS[id]);
}

/** The number of a step in a guide. A step may refer only to steps of its own guide. */
export function stepNumberIn(kind: ProjectKind, id: StepId): number {
  const index = GUIDES[kind].indexOf(id);
  if (index === -1) throw new Error(`The ${kind} guide has no step ${id}.`);
  return index + 1;
}

/** What to know, and to have, before the first step. */
export function BeforeYouStart({ kind }: { kind: ProjectKind }) {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-warning bg-warning-soft p-3 text-xs">
        <p className="font-semibold">Prima di iniziare</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {kind === 'new' ? (
            <li>
              Ti servono un account Google che possa creare progetti e l'accesso alle impostazioni
              del repository GitHub che pubblica il sito.
            </li>
          ) : (
            <>
              <li>
                Ti servono il ruolo di proprietario o editor del progetto e l'accesso alle
                impostazioni del repository GitHub che pubblica il sito.
              </li>
              <li>
                Le altre app del progetto restano come sono: aggiungi solo quello che indica la
                guida e non modificare chiavi API, provider di accesso e domini che ci sono già.
              </li>
            </>
          )}
          <li>
            Ogni passo dice dove si fa: il link apre la pagina giusta in una nuova scheda, così
            questa guida resta aperta. Gli approfondimenti spiegano il perché e le conseguenze.
          </li>
          <li>
            Basta il piano <strong>Spark</strong>, gratuito: niente carta di credito.
            {kind === 'existing' &&
              ' Se la console Google Cloud propone la prova gratuita o la fatturazione, ignorala.'}
          </li>
          <li>
            Chi fa il primo accesso diventa proprietario del piano e invita gli altri per username
            GitHub.
          </li>
        </ul>
      </div>
      <More title="quanto costa e cosa succede ai limiti">
        <p>
          Sul piano Spark il database <code>(default)</code> ha una quota gratuita ogni giorno:
          50.000 letture, 20.000 scritture, 20.000 cancellazioni e 1 GiB di dati. Per un team di
          poche persone ne basta una piccola parte.
        </p>
        <p>
          Se un giorno la quota finisce, il database smette di rispondere fino al rinnovo, verso le
          9 del mattino in Italia. Non ci sono addebiti: senza fatturazione non si paga nulla.
        </p>
      </More>
    </div>
  );
}
