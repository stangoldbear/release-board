import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Database,
  History,
  Info,
  Milestone,
  Palette,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HAS_BETA_FEATURES } from '../../app/areas';
import { canReplacePlan } from '../../app/Instance';
import type { Instance } from '../../app/Instance';
import { labelsFieldOf, projectsWithLabel } from '../../domain/labels';
import type { NotesLook } from '../../domain/notesLook';
import type { TimelineNotesLook } from '../../domain/timelineNotes';
import type { PlanSnapshot } from '../../domain/types';
import { usePreference } from '../../infra/preferences';
import { Button } from '../../shared/ui/Button';
import type { Density } from '../../shared/ui/density';
import { Dialog } from '../../shared/ui/Dialog';
import type { TextScale } from '../../shared/ui/textScale';
import type { ThemePreference } from '../../themes';
import type { ColorPreset } from '../../themes/presets';
import type { DateFormat } from '../../utils/dateUtils';
import type { PageLayout } from '../../app/layout';
import { AboutSection } from './AboutSection';
import { AccountSection } from './AccountSection';
import {
  ColorPresetSettings,
  LayoutSettings,
  TextSettings,
  ThemeSettings,
} from './AppearanceSettings';
import { BackupSection } from './BackupSection';
import { BetaSection } from './BetaSection';
import { ClosuresSection } from './ClosuresSection';
import { EmailDomainsSection } from './EmailDomainsSection';
import { InstanceSection } from './InstanceSection';
import { LabelsSettings } from './LabelsSettings';
import type { LabelActions } from './LabelsSettings';
import { LanesSettings } from './LanesSettings';
import type { LaneActions } from './LanesSettings';
import { MembersSection } from './MembersSection';
import { NotesLookSettings, TimelineNotesSettings } from './NotesSettings';
import { ProjectColorsSettings, RoadmapConfigSettings } from './RoadmapSettings';
import { SettingsTransfer } from './SettingsTransfer';
import {
  SETTINGS_SCOPE_LABELS,
  findSection,
  parseSettingsSection,
  settingsCategories,
  shownSection,
} from './settingsSections';
import type { SettingsCategoryId, SettingsSectionId } from './settingsSections';
import type { RoadmapConfigActions } from '../roadmaps/roadmapActions';
import { dayNotesColorOf } from '../../domain/roadmapConfig';

const CATEGORY_ICONS: Record<SettingsCategoryId, LucideIcon> = {
  appearance: Palette,
  releases: CalendarRange,
  roadmap: Milestone,
  people: Users,
  data: Database,
  about: Info,
};

/** The button of a section in the list, to give it the focus back. */
function sectionButtonId(id: SettingsSectionId): string {
  return `settings-section-${id}`;
}

interface SettingsDialogProps {
  plan: PlanSnapshot;
  instance: Instance;
  /** The section to open with; otherwise the one this browser saw last. */
  initialSection?: SettingsSectionId;
  theme: ThemePreference;
  onChangeTheme: (theme: ThemePreference) => void;
  colorPreset: ColorPreset;
  onChangeColorPreset: (preset: ColorPreset) => void;
  /** How the dates are written in full, in this browser. */
  dateFormat: DateFormat;
  onChangeDateFormat: (format: DateFormat) => void;
  /** Tabs at the bottom, or the buttons of the header, in this browser. */
  layout: PageLayout;
  onChangeLayout: (layout: PageLayout) => void;
  textScale: TextScale;
  onTextScaleChange: (scale: TextScale) => void;
  density: Density;
  onDensityChange: (density: Density) => void;
  /** How the row «Note sulla timeline» and the board of Notes look, in this browser. */
  timelineNotesLook: TimelineNotesLook;
  onTimelineNotesLookChange: (look: TimelineNotesLook) => void;
  notesLook: NotesLook;
  onNotesLookChange: (look: NotesLook) => void;
  onReplacePlan: (plan: PlanSnapshot) => void;
  /** The parts still in development are shown in this browser. */
  betaFeatures: boolean;
  onToggleBetaFeatures: (enabled: boolean) => void;
  /** The published rules do not know the configuration of the roadmap yet. */
  roadmapUnavailable: boolean;
  roadmapActions: RoadmapConfigActions;
  /** The rows of the tasks of Next Releases: added, renamed, put in order, removed. */
  laneActions: LaneActions;
  /** The labels of the projects: added, renamed, colored, put in order, removed. */
  labelActions: LabelActions;
  /** Opens the page with every change to the plan. */
  onOpenHistory: () => void;
  onClose: () => void;
}

/**
 * The settings by topic: the list of the categories and their sections, and one section at a
 * time beside it ("Aspetto › Tema"), with where its choices apply. On phones the list comes first
 * and a section takes its place, with a button back to the list. Mounted only while open.
 */
export function SettingsDialog({
  plan,
  instance,
  initialSection,
  theme,
  onChangeTheme,
  colorPreset,
  onChangeColorPreset,
  dateFormat,
  onChangeDateFormat,
  layout,
  onChangeLayout,
  textScale,
  onTextScaleChange,
  density,
  onDensityChange,
  timelineNotesLook,
  onTimelineNotesLookChange,
  notesLook,
  onNotesLookChange,
  onReplacePlan,
  betaFeatures,
  onToggleBetaFeatures,
  roadmapUnavailable,
  roadmapActions,
  laneActions,
  labelActions,
  onOpenHistory,
  onClose,
}: SettingsDialogProps) {
  const categories = settingsCategories({
    cloud: instance.kind === 'cloud',
    owner: instance.kind === 'cloud' && instance.role === 'owner',
    beta: HAS_BETA_FEATURES,
  });
  const [saved, setSaved] = usePreference<SettingsSectionId | null>(
    'settings-section',
    parseSettingsSection,
    null,
  );
  const [wanted] = useState(() => initialSection ?? saved);
  const [selected, setSelected] = useState(() => shownSection(categories, wanted));
  const current = findSection(categories, selected) ?? findSection(categories, 'theme');
  // On phones the list or a section; asked for a section, the window opens on it.
  const [phonePane, setPhonePane] = useState<'list' | 'section'>(
    initialSection ? 'section' : 'list',
  );
  const headingId = useId();
  const detailRef = useRef<HTMLElement>(null);

  // Every section starts from its top. A block, not an arrow that returns the call: newer browsers
  // return a promise from scrollTo, which React would take for the cleanup and call.
  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 });
  }, [selected]);

  const select = (id: SettingsSectionId) => {
    setSelected(id);
    setSaved(id);
    // On phones the list goes away: the focus goes to the section's title.
    if (phonePane === 'list' && window.matchMedia('(max-width: 639px)').matches) {
      setPhonePane('section');
      window.requestAnimationFrame(() => document.getElementById(headingId)?.focus());
    }
  };
  const backToList = () => {
    setPhonePane('list');
    window.requestAnimationFrame(() => document.getElementById(sectionButtonId(selected))?.focus());
  };

  const sectionContent = (id: SettingsSectionId): ReactNode => {
    switch (id) {
      case 'theme':
        return <ThemeSettings theme={theme} onChangeTheme={onChangeTheme} />;
      case 'colors':
        return (
          <ColorPresetSettings
            theme={theme}
            colorPreset={colorPreset}
            onChangeColorPreset={onChangeColorPreset}
          />
        );
      case 'layout':
        return (
          <LayoutSettings
            layout={layout}
            onChangeLayout={onChangeLayout}
            dateFormat={dateFormat}
            onChangeDateFormat={onChangeDateFormat}
          />
        );
      case 'text':
        return (
          <TextSettings
            textScale={textScale}
            onTextScaleChange={onTextScaleChange}
            density={density}
            onDensityChange={onDensityChange}
          />
        );
      case 'timeline-notes':
        return (
          <TimelineNotesSettings look={timelineNotesLook} onChange={onTimelineNotesLookChange} />
        );
      case 'notes':
        return <NotesLookSettings look={notesLook} onChange={onNotesLookChange} />;
      case 'lanes':
        return (
          <LanesSettings
            lanes={plan.lanes}
            tasks={plan.tasks}
            notesColorId={dayNotesColorOf(plan.roadmap)}
            actions={laneActions}
          />
        );
      case 'roadmap-config':
        return (
          <RoadmapConfigSettings
            config={plan.roadmap}
            lanes={plan.lanes.length}
            unavailable={roadmapUnavailable}
            actions={roadmapActions}
            onOpenLanes={() => select('lanes')}
          />
        );
      case 'labels': {
        const field = labelsFieldOf(plan.roadmap);
        return (
          <LabelsSettings
            labels={field?.options ?? []}
            usage={(labelId) => (field ? projectsWithLabel(plan.projects, field, labelId) : 0)}
            unavailable={roadmapUnavailable}
            actions={labelActions}
          />
        );
      }
      case 'project-colors':
        return (
          <ProjectColorsSettings
            config={plan.roadmap}
            unavailable={roadmapUnavailable}
            actions={roadmapActions}
          />
        );
      case 'closures':
        return (
          <ClosuresSection
            closures={plan.roadmap.closures ?? []}
            unavailable={roadmapUnavailable}
            onChange={(closures) => roadmapActions.onSaveSettings({ closures })}
          />
        );
      case 'account':
        return (
          instance.kind === 'cloud' && (
            <AccountSection
              user={instance.user}
              role={instance.role}
              planName={instance.planName}
              onSignOut={instance.signOut}
            />
          )
        );
      case 'members':
        return (
          instance.kind === 'cloud' && (
            <MembersSection
              members={instance.members}
              selfGithubId={instance.user.githubId}
              plan={plan}
            />
          )
        );
      case 'email-domains':
        return (
          instance.kind === 'cloud' && (
            <EmailDomainsSection
              members={instance.members}
              selfEmail={instance.user.email}
              selfEmailVerified={instance.user.emailVerified}
            />
          )
        );
      case 'backup':
        return (
          <BackupSection
            plan={plan}
            onReplacePlan={
              canReplacePlan(instance)
                ? (next) => {
                    onReplacePlan(next);
                    onClose();
                  }
                : undefined
            }
          />
        );
      case 'settings-file':
        return (
          <SettingsTransfer
            roadmap={plan.roadmap}
            roadmapUnavailable={roadmapUnavailable}
            onReplaceRoadmap={roadmapActions.onReplaceConfig}
            assignments={plan.assignments}
            appearance={{
              theme,
              colorPreset,
              dateFormat,
              layout,
              textScale,
              timelineNotes: timelineNotesLook,
              notesLook,
            }}
            onChangeAppearance={(next) => {
              if (next.theme) onChangeTheme(next.theme);
              if (next.colorPreset) onChangeColorPreset(next.colorPreset);
              if (next.dateFormat) onChangeDateFormat(next.dateFormat);
              if (next.layout) onChangeLayout(next.layout);
              if (next.textScale) onTextScaleChange(next.textScale);
              if (next.timelineNotes) onTimelineNotesLookChange(next.timelineNotes);
              if (next.notesLook) onNotesLookChange(next.notesLook);
            }}
          />
        );
      case 'history':
        return (
          <div className="space-y-3">
            <p className="text-xs text-fg-muted">
              Ogni modifica al piano, con autore, giorno e ora, in una pagina con grafici e filtri.
            </p>
            <Button onClick={onOpenHistory}>
              <History className="h-4 w-4" aria-hidden="true" />
              Apri la cronologia
            </Button>
          </div>
        );
      case 'instance':
        return instance.kind === 'local' && <InstanceSection onSignIn={instance.onSignIn} />;
      case 'about':
        return (
          <AboutSection
            storage={
              instance.kind === 'cloud'
                ? `Firestore, progetto ${instance.projectId}`
                : 'Salvati in questo browser'
            }
          />
        );
      case 'beta':
        return <BetaSection enabled={betaFeatures} onChange={onToggleBetaFeatures} />;
    }
  };

  return (
    <Dialog
      title="Impostazioni"
      onClose={onClose}
      className="h-[min(46rem,calc(100dvh-2rem))] max-w-4xl"
      bodyClassName="flex"
    >
      <nav
        aria-label="Argomenti delle impostazioni"
        className={`w-full shrink-0 overflow-y-auto overscroll-contain bg-surface-muted p-2 sm:block sm:w-60 sm:border-r sm:border-line ${
          phonePane === 'section' ? 'max-sm:hidden' : ''
        }`}
      >
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category.id];
          const titleId = `settings-category-${category.id}`;
          return (
            <div key={category.id} role="group" aria-labelledby={titleId} className="pb-2">
              <p
                id={titleId}
                className="flex items-center gap-2 px-2 pt-2 pb-1 text-xs font-bold text-fg"
              >
                <Icon className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                {category.label}
              </p>
              <ul>
                {category.sections.map((section) => {
                  const active = section.id === current?.section.id;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        id={sectionButtonId(section.id)}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => select(section.id)}
                        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-md py-2 pr-2 pl-8 text-left text-sm sm:py-1.5 ${
                          active
                            ? 'bg-accent-soft font-semibold text-fg'
                            : 'text-fg-muted hover:bg-surface-strong hover:text-fg'
                        }`}
                      >
                        {section.label}
                        <ChevronRight className="h-4 w-4 shrink-0 sm:hidden" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      {current && (
        <section
          ref={detailRef}
          aria-labelledby={headingId}
          className={`min-w-0 flex-1 overflow-y-auto overscroll-contain p-5 ${
            phonePane === 'list' ? 'max-sm:hidden' : ''
          }`}
        >
          <Button variant="ghost" size="sm" className="-ml-2 mb-2 sm:hidden" onClick={backToList}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Tutte le impostazioni
          </Button>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p className="text-xs text-fg-muted">{current.category.label} ›</p>
              <h3 id={headingId} tabIndex={-1} className="text-base font-bold outline-none">
                {current.section.label}
              </h3>
            </div>
            {current.section.scope && (
              <span className="mt-1 rounded-sm border border-line-strong px-1.5 text-xs font-semibold text-fg-muted">
                {SETTINGS_SCOPE_LABELS[current.section.scope]}
              </span>
            )}
          </div>
          {sectionContent(current.section.id)}
        </section>
      )}
    </Dialog>
  );
}
