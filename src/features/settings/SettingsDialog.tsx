import { History } from 'lucide-react';
import type { Instance } from '../../app/Instance';
import type { PlanSnapshot } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import type { TextScale } from '../../shared/ui/textScale';
import type { ThemePreference } from '../../themes';
import { AboutSection } from './AboutSection';
import { AccountSection } from './AccountSection';
import { AppearanceSection } from './AppearanceSection';
import { BackupSection } from './BackupSection';
import { BetaSection } from './BetaSection';
import { InstanceSection } from './InstanceSection';
import { MembersSection } from './MembersSection';
import { RoadmapSettingsSection } from './RoadmapSettingsSection';
import type { RoadmapConfigActions } from '../roadmaps/roadmapActions';

interface SettingsDialogProps {
  plan: PlanSnapshot;
  instance: Instance;
  theme: ThemePreference;
  onChangeTheme: (theme: ThemePreference) => void;
  textScale: TextScale;
  onTextScaleChange: (scale: TextScale) => void;
  onReplacePlan: (plan: PlanSnapshot) => void;
  /** The parts still in development are shown in this browser. */
  betaFeatures: boolean;
  onToggleBetaFeatures: (enabled: boolean) => void;
  /** The published rules do not know the configuration of the roadmap yet. */
  roadmapUnavailable: boolean;
  roadmapActions: RoadmapConfigActions;
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
        <BetaSection enabled={betaFeatures} onChange={onToggleBetaFeatures} />
        {betaFeatures && (
          <RoadmapSettingsSection
            config={plan.roadmap}
            unavailable={roadmapUnavailable}
            actions={roadmapActions}
          />
        )}
        <BackupSection
          plan={plan}
          onReplacePlan={(next) => {
            onReplacePlan(next);
            onClose();
          }}
        />
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
