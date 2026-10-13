// The email domains a shared plan admits: when the owner sets them, only accounts whose email is
// verified and of one of them see the plan, its name included. The security rules check the same.

/** At most this many domains, as the rules allow. */
export const EMAIL_DOMAINS_MAX = 20;

/** A domain name such as "example.com" or "mail.example.co.uk", in lower case. */
const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export type DomainsResult = { ok: true; domains: string[] } | { ok: false; error: string };

/**
 * The domains written in a field, separated by commas, spaces or new lines: in lower case,
 * without "@" or repetitions, in the order given.
 */
export function parseEmailDomains(text: string): DomainsResult {
  const domains = [
    ...new Set(
      text
        .split(/[\s,;]+/)
        .map((item) => item.trim().toLowerCase().replace(/^@/, ''))
        .filter((item) => item !== ''),
    ),
  ];
  if (domains.length === 0) return { ok: false, error: 'Scrivi almeno un dominio.' };
  const wrong = domains.find((domain) => !DOMAIN.test(domain));
  if (wrong) return { ok: false, error: `«${wrong}» non è un dominio, come esempio.com.` };
  if (domains.length > EMAIL_DOMAINS_MAX) {
    return { ok: false, error: `Al massimo ${EMAIL_DOMAINS_MAX} domini.` };
  }
  return { ok: true, domains };
}

/** The domain of an email address, in lower case; null without one. */
export function emailDomainOf(email: string | null): string | null {
  const domain = email?.split('@')[1]?.toLowerCase();
  return domain || null;
}

/** Whether the domains admit an account with this email, verified or not. */
export function admitsEmail(
  domains: readonly string[],
  email: string | null,
  verified: boolean,
): boolean {
  const domain = emailDomainOf(email);
  return verified && domain !== null && domains.includes(domain);
}
