import { useState } from 'react';
import { RotateCcw, SlidersHorizontal, Users } from 'lucide-react';
import {
  DEFAULT_PROJECT_COLORS,
  PROJECT_COLORS_INFO,
  PROJECT_COLORS_MODES,
  colorsProjects,
  defaultRoadmapConfig,
  isGroupable,
  isRoadmapConfigEmpty,
  projectColorField,
} from '../../domain/roadmapConfig';
import type { RoadmapConfig } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { RulesNotice } from '../../shared/ui/RulesNotice';
import type { RoadmapConfigActions } from '../roadmaps/roadmapActions';
import { ProjectFieldsDialog } from './ProjectFieldsDialog';
import { TeamDialog } from './TeamDialog';

/** The defaults of the repository with the company closures of the plan, which are no default. */
function defaultsKeeping(config: RoadmapConfig): RoadmapConfig {
  const defaults = defaultRoadmapConfig();
  return config.closures ? { ...defaults, closures: config.closures } : defaults;
}

interface RoadmapSettingsProps {
  config: RoadmapConfig;
  /** The published rules do not know the configuration yet: the section says so, and no more. */
  unavailable: boolean;
  actions: RoadmapConfigActions;
}

/**
 * How the projects of the roadmap are described: the custom fields, the teams and the people,
 * each edited in a window of its own, and the defaults of the repository to load or to restore.
 */
export function RoadmapConfigSettings({ config, unavailable, actions }: RoadmapSettingsProps) {
  const [open, setOpen] = useState<'fields' | 'team' | null>(null);
  const [confirmDefaults, setConfirmDefaults] = useState(false);
  const empty = isRoadmapConfigEmpty(config);
  const mainFields = config.fields.filter((field) => field.main).length;
  const groupFields = config.fields.filter(isGroupable).length;

  if (unavailable) return <RulesNotice what="I campi, i team e le persone dei progetti" />;
  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-muted">
        Come sono descritti i progetti: i campi personalizzati, i team e le persone che ci lavorano.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-fg-muted" aria-hidden="true" />
            Campi dei progetti
          </p>
          <p className="text-xs text-fg-muted">
            {config.fields.length} {config.fields.length === 1 ? 'campo' : 'campi'}, {mainFields}{' '}
            {mainFields === 1 ? 'principale' : 'principali'}
            {groupFields > 0 && `, ${groupFields} per raggruppare`}
          </p>
          <Button size="sm" className="self-start" onClick={() => setOpen('fields')}>
            Modifica i campi…
          </Button>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Users className="h-4 w-4 text-fg-muted" aria-hidden="true" />
            Team e persone
          </p>
          <p className="text-xs text-fg-muted">
            {config.teams.length} team, {config.stakeholders.length}{' '}
            {config.stakeholders.length === 1 ? 'persona' : 'persone'}
          </p>
          <Button size="sm" className="self-start" onClick={() => setOpen('team')}>
            Modifica team e persone…
          </Button>
        </div>
      </div>
      {empty ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning bg-warning-soft p-3 text-xs">
          <span>
            Nessuna configurazione: questa istanza è nata prima dei campi e dei team. I predefiniti
            portano la dimensione dei progetti, i campi Jira, Figma e Confluence, sei team e sedici
            persone.
          </span>
          <Button
            size="sm"
            variant="primary"
            onClick={() => actions.onReplaceConfig(defaultsKeeping(config))}
          >
            Carica i predefiniti
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDefaults(true)}
          className="flex cursor-pointer items-center gap-1 text-xs font-medium text-link hover:underline"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Ripristina i predefiniti del repository
        </button>
      )}

      {open === 'fields' && (
        <ProjectFieldsDialog config={config} actions={actions} onClose={() => setOpen(null)} />
      )}
      {open === 'team' && (
        <TeamDialog config={config} actions={actions} onClose={() => setOpen(null)} />
      )}
      {confirmDefaults && (
        <ConfirmDialog
          title="Ripristinare i predefiniti?"
          message="Campi, team e persone tornano a quelli del repository: le modifiche fatte qui si perdono, e il lavoro assegnato a persone che spariscono viene tolto dai progetti. I valori che i progetti hanno nei campi restano."
          confirmLabel="Ripristina"
          onConfirm={() => {
            setConfirmDefaults(false);
            actions.onReplaceConfig(defaultsKeeping(config));
          }}
          onCancel={() => setConfirmDefaults(false)}
        />
      )}
    </div>
  );
}

/** Where the color of the bar of a project comes from: the value of a field, or each project's own. */
export function ProjectColorsSettings({ config, unavailable, actions }: RoadmapSettingsProps) {
  const coloring = config.fields.filter(colorsProjects);
  const colorField = projectColorField(config);
  const projectColors = config.projectColors ?? DEFAULT_PROJECT_COLORS;

  if (unavailable) return <RulesNotice what="I colori dei progetti" />;
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-xs text-fg-muted">
        Da dove viene il colore della barra di un progetto.
      </legend>
      {PROJECT_COLORS_MODES.map((mode) => {
        const disabled = mode === 'field' && coloring.length === 0;
        return (
          <label
            key={mode}
            className={`flex items-start gap-2 text-sm ${
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
            }`}
            title={
              disabled
                ? 'Serve una lista di valori esclusivi con un colore per valore: «Modifica i campi…»'
                : undefined
            }
          >
            <input
              type="radio"
              name="project-colors"
              value={mode}
              checked={projectColors === mode}
              disabled={disabled}
              onChange={() => actions.onSaveSettings({ projectColors: mode })}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">{PROJECT_COLORS_INFO[mode].label}</span>
              <span className="block text-xs text-fg-muted">
                {PROJECT_COLORS_INFO[mode].description}
              </span>
            </span>
          </label>
        );
      })}
      {/* The field tags the projects with either mode: it colors the bars with the first. */}
      {coloring.length > 1 && (
        <label className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold">
            {projectColors === 'field' ? 'Campo' : 'Campo dell’etichetta'}
          </span>
          <select
            value={colorField?.id ?? ''}
            onChange={(event) =>
              actions.onSaveSettings({ colorFieldId: event.target.value || null })
            }
            className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs"
          >
            {coloring.map((field) => (
              <option key={field.id} value={field.id}>
                {field.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </fieldset>
  );
}
