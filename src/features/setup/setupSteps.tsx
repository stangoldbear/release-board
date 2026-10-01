import type { ReactNode } from 'react';
import { FIREBASE_ENV_VARS } from '../../infra/firebase/config';
import { CopyButton } from '../../shared/ui/CopyButton';
import rules from '../../../firestore/firestore.rules?raw';

/** Whether the guide sets up a new Firebase project or one that is already in use. */
export type ProjectKind = 'new' | 'existing';

/** The site where a step is done, and the page of it where the step starts. */
export interface Place {
  name: string;
  url: string;
}

/** What the steps need to know about this copy of the app. */
export interface StepContext {
  kind: ProjectKind;
  /** Host name of this site: the domain to authorize, and the site the API key accepts. */
  host: string;
  /** Address of this site: the homepage of the OAuth app. */
  siteUrl: string;
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

/** Turns the empty Datastore mode database of a project into one that this app can use. */
const CONVERT_COMMAND =
  "gcloud firestore databases update --database='(default)' --type=firestore-native";

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

function Note({ children }: { children: ReactNode }) {
  return <p className="text-xs text-fg-muted">{children}</p>;
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

const STEPS = {
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
    content: () => (
      <Actions>
        <li>
          Nel menu a sinistra scegli <strong>Firestore Database</strong> e premi{' '}
          <strong>Crea database</strong>.
        </li>
        <li>
          Scegli l'edizione <strong>Standard</strong> e lascia l'ID <code>(default)</code>.
        </li>
        <li>
          Scegli una località in Europa, per esempio <code>europe-west8</code> (Milano): non si
          potrà cambiare.
        </li>
        <li>
          Scegli <strong>Avvia in modalità di produzione</strong> e premi <strong>Crea</strong>.
        </li>
      </Actions>
    ),
  },
  checkDatabase: {
    title: 'Controlla il database',
    place: CLOUD_DATABASES,
    content: () => (
      <>
        <Actions>
          <li>
            Apri la pagina dal link qui sopra e scegli il progetto nel selettore in alto: ha lo
            stesso nome che nella console Firebase.
          </li>
          <li>
            Cerca la riga con ID <code>(default)</code>, guarda la colonna <strong>Modalità</strong>{' '}
            e apri il database per vedere se contiene dati.
          </li>
        </Actions>
        <p>Poi, secondo quello che trovi:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Vuoto e in modalità Datastore</strong> (la colonna Modalità nomina Datastore):
            va convertito, al passo successivo.
          </li>
          <li>
            <strong>Vuoto e in un'altra modalità</strong>: è già pronto. Salta il passo successivo.
          </li>
          <li>
            <strong>
              Nessuna riga <code>(default)</code>
            </strong>
            : crea il database dalla console Firebase, con{' '}
            <strong>Firestore Database → Crea database</strong>: edizione Standard, ID{' '}
            <code>(default)</code>, una località in Europa, modalità di produzione. Poi salta il
            passo successivo.
          </li>
          <li>
            <strong>Contiene dati</strong>: lo usa già un'altra app. Fermati qui: le regole di
            sicurezza di Release Board valgono per tutto il database e bloccherebbero quell'app.
            Serve un progetto nuovo.
          </li>
        </ul>
      </>
    ),
  },
  convertDatabase: {
    title: 'Converti il database, se è in modalità Datastore',
    place: CLOUD_DATABASES,
    content: () => (
      <>
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
            <div className="flex items-start gap-2">
              <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-surface-strong px-2.5 py-1.5 font-mono text-xs text-fg">
                {CONVERT_COMMAND}
              </pre>
              <CopyButton text={CONVERT_COMMAND} confirmation="Comando copiato" />
            </div>
          </li>
          <li>
            Aspetta qualche minuto. La conversione è finita quando la pagina{' '}
            <strong>Firestore Database</strong> della console Firebase non mostra più l'avviso sulla
            modalità Datastore.
          </li>
        </Actions>
        <Note>Si può convertire solo un database vuoto. La sua località resta la stessa.</Note>
      </>
    ),
  },
  enableGitHub: {
    title: 'Attiva il provider GitHub',
    place: FIREBASE_CONSOLE,
    content: ({ kind }) => (
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
            secret: li crei su GitHub al passo successivo.
          </li>
          <li>
            Copia l'<strong>URL di callback</strong> che la finestra mostra in basso: finisce con{' '}
            <code>/__/auth/handler</code>. Lascia la finestra aperta.
          </li>
        </Actions>
        {kind === 'existing' && (
          <Note>
            I provider già attivi restano come sono. Se le altre app usano Authentication, chi entra
            in Release Board compare nello stesso elenco di utenti: il piano resta visibile solo ai
            membri invitati.
          </Note>
        )}
      </>
    ),
  },
  createOAuthApp: {
    title: "Crea l'app OAuth",
    place: GITHUB_OAUTH_APPS,
    content: ({ siteUrl }) => (
      <Actions>
        <li>
          Apri <strong>Settings → Developer settings → OAuth Apps</strong>: quelle
          dell'organizzazione GitHub, dalla pagina dell'organizzazione, se ne sei amministratore;
          altrimenti quelle del tuo account, dal menu del tuo avatar. Il link qui sopra porta a
          quelle del tuo account.
        </li>
        <li>
          Premi <strong>New OAuth App</strong> (in un'organizzazione{' '}
          <strong>New Org OAuth App</strong>).
        </li>
        <li>
          <strong>Application name</strong>: <code>Release Board</code>.
        </li>
        <li>
          <strong>Homepage URL</strong>: l'indirizzo di questo sito,{' '}
          <CopyValue value={siteUrl} confirmation="Indirizzo copiato" />
        </li>
        <li>
          <strong>Authorization callback URL</strong>: l'URL di callback copiato dalla console
          Firebase al passo precedente.
        </li>
        <li>
          Lascia spento <strong>Enable Device Flow</strong> e premi{' '}
          <strong>Register application</strong>.
        </li>
        <li>
          Copia il <strong>Client ID</strong>. Poi premi{' '}
          <strong>Generate a new client secret</strong> e copia il secret: GitHub lo mostra una
          volta sola.
        </li>
      </Actions>
    ),
  },
  saveGitHubCredentials: {
    title: 'Completa il provider GitHub',
    place: FIREBASE_CONSOLE,
    content: () => (
      <>
        <Actions>
          <li>
            Torna alla finestra del provider GitHub lasciata aperta. Se l'hai chiusa, riaprila da{' '}
            <strong>Authentication → Metodo di accesso</strong>.
          </li>
          <li>
            Incolla <strong>Client ID</strong> e <strong>Client secret</strong> e premi{' '}
            <strong>Salva</strong>.
          </li>
        </Actions>
        <Note>Il secret serve solo qui: non va messo altrove.</Note>
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
      </>
    ),
  },
  registerWebApp: {
    title: "Registra l'app web",
    place: FIREBASE_CONSOLE,
    content: ({ kind }) => (
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
            Compare un blocco di codice con <code>firebaseConfig</code>: i suoi valori servono più
            avanti. Lo ritrovi in qualsiasi momento in questa pagina, sotto l'app web.
          </li>
        </Actions>
        {kind === 'existing' && (
          <Note>
            Le app già registrate, per esempio quelle iOS e Android, restano come sono. Il valore{' '}
            <code>measurementId</code>, se c'è, non serve.
          </Note>
        )}
      </>
    ),
  },
  createApiKey: {
    title: 'Crea una chiave API dedicata',
    place: CLOUD_CREDENTIALS,
    content: ({ host }) => (
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
            e l'<code>authDomain</code> del <code>firebaseConfig</code> nello stesso formato, per
            esempio <code>https://mio-progetto.firebaseapp.com/*</code>.
          </li>
          <li>
            In <strong>Restrizioni delle API</strong> scegli <strong>Limita chiave</strong> e
            seleziona <strong>Identity Toolkit API</strong>, <strong>Token Service API</strong>,{' '}
            <strong>Cloud Firestore API</strong> e <strong>Cloud Datastore API</strong>. Premi{' '}
            <strong>Salva</strong>.
          </li>
          <li>
            Nell'elenco premi <strong>Mostra chiave</strong> e copiala: va nelle variabili del sito
            al posto dell'<code>apiKey</code> del <code>firebaseConfig</code>.
          </li>
        </Actions>
        <Note>
          Non modificare le chiavi che c'erano già: le usano le altre app. Se dopo la pubblicazione
          l'accesso non riesce, l'app indica quale restrizione di questa chiave controllare.
        </Note>
      </>
    ),
  },
  publishRules: {
    title: 'Pubblica le regole di sicurezza',
    place: FIREBASE_CONSOLE,
    content: ({ kind }) => (
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
              Valgono per tutto il database <code>(default)</code>: per questo doveva essere libero.
            </>
          )}
        </Note>
      </>
    ),
  },
  setVariables: {
    title: 'Imposta le variabili del sito',
    place: GITHUB,
    content: ({ kind }) => (
      <>
        <Actions>
          <li>
            Apri il repository che pubblica il sito, poi{' '}
            <strong>Settings → Secrets and variables → Actions</strong> e la scheda{' '}
            <strong>Variables</strong>.
          </li>
          <li>
            Per ogni riga qui sotto premi <strong>New repository variable</strong>, inserisci nome e
            valore e premi <strong>Add variable</strong>.
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
        <Note>
          Vanno tra le variabili, non tra i secret: sono identificativi pubblici per costruzione, e
          i dati li proteggono le regole.
        </Note>
      </>
    ),
  },
  redeploy: {
    title: 'Pubblica di nuovo il sito',
    place: GITHUB,
    content: () => (
      <Actions>
        <li>
          Nello stesso repository apri la scheda <strong>Actions</strong>, scegli{' '}
          <strong>Deploy Pages</strong> nell'elenco a sinistra e premi <strong>Run workflow</strong>
          , poi di nuovo <strong>Run workflow</strong> per confermare.
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
    ),
  },
} satisfies Record<string, GuideStep>;

/**
 * The steps of each guide, in order. Steps refer to each other as "the next" or "the previous"
 * one, so those neighbours must stay next to each other in both guides.
 */
const GUIDES: Record<ProjectKind, readonly (keyof typeof STEPS)[]> = {
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

/** What to know, and to have, before the first step. */
export function BeforeYouStart({ kind }: { kind: ProjectKind }) {
  return (
    <div className="rounded-lg border border-warning bg-warning-soft p-3 text-xs">
      <p className="font-semibold">Prima di iniziare</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {kind === 'new' ? (
          <li>
            Ti servono un account Google che possa creare progetti e l'accesso alle impostazioni del
            repository GitHub che pubblica il sito.
          </li>
        ) : (
          <>
            <li>
              Ti servono il ruolo di proprietario o editor del progetto e l'accesso alle
              impostazioni del repository GitHub che pubblica il sito.
            </li>
            <li>
              Le altre app del progetto restano come sono: aggiungi solo quello che indica la guida
              e non modificare chiavi API, provider di accesso e domini che ci sono già.
            </li>
          </>
        )}
        <li>
          Ogni passo dice dove si fa: il link apre la pagina giusta in una nuova scheda, così questa
          guida resta aperta.
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
  );
}
