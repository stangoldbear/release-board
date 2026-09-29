import { useLayoutEffect, useState } from 'react';
import { isPlanEmpty } from '../domain/plan';
import { WelcomeScreen } from '../features/setup/WelcomeScreen';
import { LocalPlanRepository } from '../infra/LocalPlanRepository';
import { isBoolean, usePreference } from '../infra/preferences';
import { createId } from '../utils/id';
import App from './App';

/** The browser's local storage, or null when the browser does not allow it. */
function localStorageIfAllowed(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

interface LocalRootProps {
  /** In a configured instance, the way back to the sign-in screen. */
  onSignIn?: () => void;
}

/**
 * The app on the data of this browser. A browser that already holds a plan goes straight to the
 * calendar; a new one is welcomed and asked whether to try locally or set up a shared instance.
 */
export function LocalRoot({ onSignIn }: LocalRootProps) {
  const [repository] = useState(
    () =>
      new LocalPlanRepository({
        storage: localStorageIfAllowed(),
        events: window,
        now: () => new Date(),
        createId,
      }),
  );
  const [chosen, setChosen] = usePreference('local-mode', isBoolean, false);
  const [hasData, setHasData] = useState(false);
  useLayoutEffect(
    () => repository.subscribe((plan) => setHasData(!isPlanEmpty(plan))),
    [repository],
  );

  if (!chosen && !hasData && !onSignIn) {
    return <WelcomeScreen onTryLocal={() => setChosen(true)} />;
  }
  return (
    <App
      repository={repository}
      instance={{ kind: 'local', onSignIn }}
      loadWarning={repository.loadWarning}
    />
  );
}
