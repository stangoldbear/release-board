import { describe, expect, it } from 'vitest';
import { INITIAL_SYNC, OUTDATED_RULES_MESSAGE } from './PlanRepository';
import { syncPresentation } from './SyncIndicator';

describe('the sync indicator', () => {
  it('says that the rules are old before saying what is missing because of them', () => {
    const shown = syncPresentation({ ...INITIAL_SYNC, outdatedRules: true, missing: ['contacts'] });
    expect(shown.text).toBe('Regole da aggiornare');
    expect(shown.detail).toBe(
      `${OUTDATED_RULES_MESSAGE} Finché non lo fa, non sono disponibili: Contatti.`,
    );
  });

  it('names the missing parts alone when the rules are of this version', () => {
    const shown = syncPresentation({ ...INITIAL_SYNC, missing: ['contacts'] });
    expect(shown.text).toBe('Parti non disponibili');
    expect(shown.detail).toMatch(/^Contatti non disponibili: .*ricarica la pagina\.$/);
  });

  it('adds the reason to a refused change while the rules are old', () => {
    const shown = syncPresentation({
      ...INITIAL_SYNC,
      status: 'error',
      error: 'Modifica rifiutata.',
      outdatedRules: true,
    });
    expect(shown.text).toBe('Errore');
    expect(shown.detail).toBe(`Modifica rifiutata. ${OUTDATED_RULES_MESSAGE}`);
  });
});
