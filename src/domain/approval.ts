import type { ApprovalLight } from './types';

/** From the least to the most restrictive. */
export const APPROVAL_LIGHTS: readonly ApprovalLight[] = ['green', 'orange', 'red'];

export const APPROVAL_LABELS: Record<ApprovalLight, { name: string; meaning: string }> = {
  green: { name: 'Verde', meaning: 'Nessun vincolo sui rilasci' },
  orange: { name: 'Arancione', meaning: 'Rilasci con cautela' },
  red: { name: 'Rosso', meaning: "Rilasci solo con l'approvazione degli stakeholder" },
};

/** The most restrictive light among some days, for a column that adds them up. */
export function strictestLight(
  lights: readonly (ApprovalLight | undefined)[],
): ApprovalLight | undefined {
  let strictest: ApprovalLight | undefined;
  for (const light of lights) {
    if (
      light &&
      (!strictest || APPROVAL_LIGHTS.indexOf(light) > APPROVAL_LIGHTS.indexOf(strictest))
    )
      strictest = light;
  }
  return strictest;
}
