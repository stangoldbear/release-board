import { History } from 'lucide-react';
import { HAS_BETA_FEATURES } from '../../app/areas';
import { canReplacePlan } from '../../app/Instance';
import type { Instance } from '../../app/Instance';
import type { PlanSnapshot } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import type { TextScale } from '../../shared/ui/textScale';
import type { ThemePreference } from '../../themes';
import type { ColorPreset } from '../../themes/presets';
import type { DateFormat } from '../../utils/dateUtils';
import type { PageLayout } from '../../app/layout';
import { AboutSection } from './AboutSection';
import { AccountSection } from './AccountSection';
import { AppearanceSection } from './AppearanceSection';
import { BackupSection } from './BackupSection';
import { BetaSection } from './BetaSection';
import { ClosuresSection } from './ClosuresSection';
import { InstanceSection } from './InstanceSection';
import { MembersSection } from './MembersSection';
import { RoadmapSettingsSection } from './RoadmapSettingsSection';
import { SettingsTransfer } from './SettingsTransfer';
import type { RoadmapConfigActions } from '../roadmaps/roadmapActions';

interface SettingsDialogProps {
  plan: PlanSnapshot;
  instance: Instance;
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
  onReplacePlan: (plan: PlanSnapshot) => void;
  /** The parts still in development are shown in this browser. */
  betaFeatures: boolean;
  onToggleBetaFeatures: (enabled: boolean) => void;
  /** The published rules do not know the configuration of the roadmap yet. */
  roadmapUnavailable: boolean;
  roadmapActions: RoadmapConfigActions;
  /** How the roadmap draws the work of the team in the bar of a project, in this browser. */
  /** Opens the page with every change to the plan. */
  onOpenHistory: () => void;
  onClose: () => void;
}

/** Settings overlay. Mounted only while open. */
export function SettingsDialog({
  plan,
  instance,
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
  onReplacePlan,
  betaFeatures,
  onToggleBetaFeatures,
  roadmapUnavailable,
  roadmapActions,
  onOpenHistory,
  onClose,
}: SettingsDialogProps) {
  return (
    <Dialog title="Impostazioni" onClose={onClose} className="max-w-lg">
      <div className="space-y-6">
        <AppearanceSection
          theme={theme}
          onChangeTheme={onChangeTheme}
          colorPreset={colorPreset}
          onChangeColorPreset={onChangeColorPreset}
          dateFormat={dateFormat}
          onChangeDateFormat={onChangeDateFormat}
          layout={layout}
          onChangeLayout={onChangeLayout}
          textScale={textScale}
          onTextScaleChange={onTextScaleChange}
        />
        {instance.kind === 'cloud' && (
          <AccountSection
            user={instance.user}
            role={instance.role}
            planName={instance.planName}
            onSignOut={instance.signOut}
          />
        )}
        {instance.kind === 'cloud' && instance.role === 'owner' && (
          <MembersSection
            members={instance.members}
            selfGithubId={instance.user.githubId}
            selfEmail={instance.user.email}
            selfEmailVerified={instance.user.emailVerified}
            plan={plan}
          />
        )}
        {instance.kind === 'cloud' && (
          <section aria-labelledby="settings-history" className="space-y-2">
            <h3 id="settings-history" className="text-sm font-bold">
              Cronologia
            </h3>
            <p className="text-xs text-fg-muted">
              Ogni modifica al piano, con autore, giorno e ora, in una pagina con grafici e filtri.
            </p>
            <Button onClick={onOpenHistory}>
              <History className="h-4 w-4" aria-hidden="true" />
              Apri la cronologia
            </Button>
          </section>
        )}
        {HAS_BETA_FEATURES && (
          <BetaSection enabled={betaFeatures} onChange={onToggleBetaFeatures} />
        )}
        <RoadmapSettingsSection
          config={plan.roadmap}
          unavailable={roadmapUnavailable}
          actions={roadmapActions}
        />
        <ClosuresSection
          closures={plan.roadmap.closures ?? []}
          unavailable={roadmapUnavailable}
          onChange={(closures) => roadmapActions.onSaveSettings({ closures })}
        />
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
        >
          <SettingsTransfer
            roadmap={plan.roadmap}
            roadmapUnavailable={roadmapUnavailable}
            onReplaceRoadmap={roadmapActions.onReplaceConfig}
            assignments={plan.assignments}
            appearance={{ theme, colorPreset, dateFormat, layout, textScale }}
            onChangeAppearance={(next) => {
              if (next.theme) onChangeTheme(next.theme);
              if (next.colorPreset) onChangeColorPreset(next.colorPreset);
              if (next.dateFormat) onChangeDateFormat(next.dateFormat);
              if (next.layout) onChangeLayout(next.layout);
              if (next.textScale) onTextScaleChange(next.textScale);
            }}
          />
        </BackupSection>
        {instance.kind === 'local' && <InstanceSection onSignIn={instance.onSignIn} />}
        <AboutSection
          storage={
            instance.kind === 'cloud'
              ? `Firestore, progetto ${instance.projectId}`
              : 'Salvati in questo browser'
          }
        />
      </div>
    </Dialog>
  );
}
