import { useId, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import { LABEL_CLASS } from '../../shared/ui/field';
import { VersionStamp } from '../../shared/ui/VersionStamp';
import { BeforeYouStart, stepNumberIn, stepsFor } from './setupSteps';
import type { GuideStep, Place, ProjectKind, StepContext } from './setupSteps';

const PROJECT_KINDS: { kind: ProjectKind; label: string; hint: string }[] = [
  {
    kind: 'new',
    label: 'Creo un nuovo progetto',
    hint: 'La strada più semplice: un progetto solo per Release Board.',
  },
  {
    kind: 'existing',
    label: 'Ho già un progetto',
    hint: 'Un progetto che usi già, anche con altre app: Release Board aggiunge solo quello che gli serve.',
  },
];

/** Two radio buttons that look like a switch. */
function ProjectKindChoice({
  value,
  onChange,
}: {
  value: ProjectKind;
  onChange: (kind: ProjectKind) => void;
}) {
  const name = useId();
  const hintId = useId();
  return (
    <fieldset aria-describedby={hintId}>
      <legend className={LABEL_CLASS}>Progetto Firebase</legend>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-strong p-1">
        {PROJECT_KINDS.map(({ kind, label }) => (
          <label
            key={kind}
            className="flex cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-semibold text-fg-muted transition-colors hover:text-fg has-checked:bg-surface has-checked:text-fg has-checked:shadow-xs has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
          >
            <input
              type="radio"
              name={name}
              value={kind}
              checked={value === kind}
              onChange={() => onChange(kind)}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>
      <p id={hintId} className="mt-1.5 text-xs text-fg-muted">
        {PROJECT_KINDS.find((option) => option.kind === value)?.hint}
      </p>
    </fieldset>
  );
}

/** Where a step is done, as a link that opens that site in a new tab. */
function PlaceLink({ place }: { place: Place }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-fg-muted">
      Dove:
      <a
        href={place.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-surface-muted px-2.5 py-0.5 font-semibold text-link hover:bg-surface-strong"
      >
        {place.name}
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
        <span className="sr-only"> (si apre in una nuova scheda)</span>
      </a>
    </p>
  );
}

function Step({
  number,
  step,
  context,
}: {
  number: number;
  step: GuideStep;
  context: StepContext;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-on-accent"
      >
        {number}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="text-sm font-bold">
            <span className="sr-only">Passo {number}: </span>
            {step.title}
          </h3>
          <PlaceLink place={step.place} />
        </div>
        <div className="space-y-2 text-sm">{step.content(context)}</div>
      </div>
    </li>
  );
}

/**
 * How to give this copy of the app a Firebase project, new or already in use. Each step says on
 * which site it is done; everything to type or paste has a copy button, and the values that come
 * from the consoles are described, not guessed.
 */
export function SetupGuide() {
  const [kind, setKind] = useState<ProjectKind>('new');
  const context: StepContext = {
    kind,
    host: window.location.hostname,
    siteUrl: `${window.location.origin}${window.location.pathname}`,
    stepNumber: (id) => stepNumberIn(kind, id),
  };
  return (
    // Inline code looks the same everywhere in the guide, deep-dives included.
    <div className="space-y-5 [&_code]:rounded [&_code]:bg-surface-strong [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:wrap-break-word [&_code]:text-fg">
      <ProjectKindChoice value={kind} onChange={setKind} />
      <BeforeYouStart kind={kind} />
      <ol className="space-y-5">
        {stepsFor(kind).map((step, index) => (
          <Step key={step.title} number={index + 1} step={step} context={context} />
        ))}
      </ol>
    </div>
  );
}

export function SetupGuideDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      title="Configura la tua istanza"
      description="Un progetto Firebase per il tuo team, nuovo o già esistente"
      onClose={onClose}
      className="max-w-2xl"
      footer={
        <>
          {/* The guide covers the page: it shows which build it describes on its own. */}
          <VersionStamp className="mr-auto" />
          <Button onClick={onClose}>Chiudi</Button>
        </>
      }
    >
      <SetupGuide />
    </Dialog>
  );
}
