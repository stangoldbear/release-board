import { describe, expect, it } from 'vitest';
import { EMAIL_DOMAINS_MAX, admitsEmail, emailDomainOf, parseEmailDomains } from './emailDomains';

describe('parseEmailDomains', () => {
  it('reads domains separated by commas, spaces or lines, in lower case and once each', () => {
    expect(parseEmailDomains(' Example.com, @mail.example.com\nexample.com ')).toEqual({
      ok: true,
      domains: ['example.com', 'mail.example.com'],
    });
  });

  it('refuses an empty list, something that is not a domain and too many domains', () => {
    expect(parseEmailDomains(' , ').ok).toBe(false);
    expect(parseEmailDomains('example')).toEqual({
      ok: false,
      error: '«example» non è un dominio, come esempio.com.',
    });
    expect(parseEmailDomains('someone@example.com').ok).toBe(false);
    const many = Array.from({ length: EMAIL_DOMAINS_MAX + 1 }, (_, index) => `d${index}.com`);
    expect(parseEmailDomains(many.join(',')).ok).toBe(false);
  });
});

describe('admitsEmail', () => {
  it('admits a verified email of one of the domains, whatever its case', () => {
    expect(admitsEmail(['example.com'], 'Someone@Example.COM', true)).toBe(true);
  });

  it('refuses an email of another domain, an unverified one and none', () => {
    expect(admitsEmail(['example.com'], 'someone@example.org', true)).toBe(false);
    expect(admitsEmail(['example.com'], 'someone@example.com', false)).toBe(false);
    expect(admitsEmail(['example.com'], null, true)).toBe(false);
  });
});

describe('emailDomainOf', () => {
  it('gives the domain in lower case, or null', () => {
    expect(emailDomainOf('a@Example.com')).toBe('example.com');
    expect(emailDomainOf('nobody')).toBeNull();
    expect(emailDomainOf(null)).toBeNull();
  });
});
