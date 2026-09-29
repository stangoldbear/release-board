import type { ReactNode } from 'react';
import { FIREBASE_ENV_VARS } from '../../infra/firebase/config';
import { Button } from '../../shared/ui/Button';
import { CopyButton } from '../../shared/ui/CopyButton';
import { Dialog } from '../../shared/ui/Dialog';
import rules from '../../../firestore/firestore.rules?raw';

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-on-accent">
        {number}
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <h4 className="text-sm font-bold">{title}</h4>
        <div className="space-y-1.5 text-xs text-fg-muted [&_code]:rounded [&_code]:bg-surface-strong [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-fg">
          {children}
        </div>
      </div>
    </li>
  );
}

/**
 * How to give this copy of the app its own Firebase project. Everything the person has to type
 * or paste has a copy button; the values that come from the console are described, not guessed.
 */
export function SetupGuide() {
  const host = window.location.hostname;
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-warning bg-warning-soft p-3 text-xs">
        <p className="font-semibold">Prima di iniziare</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>
            Usa un <strong>progetto Firebase dedicato</strong>: non condividerlo con app di
            produzione.
          </li>
          <li>
            Serve un database <strong>Firestore standard</strong>: un database creato in{' '}
            <strong>modalità Datastore</strong> (compatibilità Datastore) non funziona con questa
            app.
          </li>
          <li>
            Il piano <strong>Spark</strong> (gratuito) basta: niente carta di credito, niente Cloud
            Functions.
          </li>
          <li>
            Chi fa il primo accesso diventa proprietario del piano e invita gli altri per username
            GitHub.
          </li>
        </ul>
      </div>

      <ol className="space-y-4">
        <Step number={1} title="Crea il progetto Firebase">
          <p>
            Su console.firebase.google.com: <strong>Aggiungi progetto</strong>, disattiva Google
            Analytics, resta sul piano Spark.
          </p>
        </Step>
        <Step number={2} title="Crea il database Firestore">
          <p>
            <strong>Build → Firestore Database → Crea database</strong>: edizione Standard, ID{' '}
            <code>(default)</code>, una località europea (per esempio <code>europe-west8</code>,
            Milano), regole in modalità di produzione. La località non si può cambiare dopo.
          </p>
        </Step>
        <Step number={3} title="Attiva l'accesso con GitHub">
          <p>
            <strong>Build → Authentication → Metodo di accesso → GitHub → Abilita</strong>. La
            finestra mostra un URL di callback: copialo, serve al passo 4. Lascia la finestra
            aperta.
          </p>
        </Step>
        <Step number={4} title="Crea l'app OAuth su GitHub">
          <p>
            Nell'organizzazione GitHub (o nel tuo account):{' '}
            <strong>Settings → Developer settings → OAuth Apps → New OAuth App</strong>. Homepage:
            questo sito. Authorization callback URL: l'URL copiato al passo 3. Device Flow spento.
          </p>
          <p>
            Copia <strong>Client ID</strong> e genera un <strong>Client secret</strong>, poi
            incollali nella finestra di Firebase e salva. Il secret resta solo lì.
          </p>
        </Step>
        <Step number={5} title="Autorizza questo dominio">
          <p className="flex flex-wrap items-center gap-2">
            <span>
              <strong>Authentication → Settings → Domini autorizzati → Aggiungi</strong>:
            </span>
            <code>{host}</code>
            <CopyButton text={host} confirmation="Dominio copiato" />
          </p>
        </Step>
        <Step number={6} title="Registra l'app web e imposta le variabili">
          <p>
            <strong>Impostazioni progetto → Le tue app → Aggiungi app → Web</strong>, senza Hosting.
            Dal <code>firebaseConfig</code> servono quattro valori, da mettere nel repository che
            pubblica il sito:{' '}
            <strong>Settings → Secrets and variables → Actions → Variables</strong>.
          </p>
          <ul className="space-y-1">
            {FIREBASE_ENV_VARS.map((name, index) => (
              <li key={name} className="flex flex-wrap items-center gap-2">
                <code>{name}</code>
                <span>← {['apiKey', 'authDomain', 'projectId', 'appId'][index]}</span>
                <CopyButton text={name} confirmation="Nome copiato" />
              </li>
            ))}
          </ul>
          <p>
            Sono valori pubblici per costruzione: la protezione dei dati sono le regole del passo 7.
          </p>
        </Step>
        <Step number={7} title="Pubblica le regole di sicurezza">
          <p className="flex flex-wrap items-center gap-2">
            <span>
              <strong>Firestore Database → Regole</strong>: sostituisci il testo con queste regole e
              premi Pubblica.
            </span>
            <CopyButton text={rules} label="Copia regole" confirmation="Regole copiate" />
          </p>
        </Step>
        <Step number={8} title="Pubblica di nuovo il sito">
          <p>
            <strong>Actions → Deploy Pages → Run workflow</strong>. Al prossimo caricamento questa
            schermata lascia il posto all'accesso con GitHub.
          </p>
        </Step>
      </ol>
    </div>
  );
}

export function SetupGuideDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      title="Configura la tua istanza"
      description="Un progetto Firebase per il tuo team, in otto passi"
      onClose={onClose}
      className="max-w-2xl"
      footer={<Button onClick={onClose}>Chiudi</Button>}
    >
      <SetupGuide />
    </Dialog>
  );
}
