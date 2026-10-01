import { describe, expect, it } from 'vitest';
import { describeAuthError } from './auth';

describe('describeAuthError', () => {
  it('names the restriction of the API key that blocked the sign-in', () => {
    expect(
      describeAuthError('auth/requests-from-referer-https://team.example.org/-are-blocked.'),
    ).toContain('restrizioni dei siti web');
    expect(
      describeAuthError(
        'auth/requests-to-this-api-identitytoolkit-method-google.cloud.identitytoolkit.v1.projectconfigservice.getprojectconfig-are-blocked.',
      ),
    ).toContain('restrizioni delle API');
    expect(describeAuthError('auth/api-key-not-valid.-please-pass-a-valid-api-key.')).toContain(
      'VITE_FIREBASE_API_KEY',
    );
  });

  it('shows the code of the errors it does not know', () => {
    expect(describeAuthError('auth/internal-error')).toBe(
      'Accesso non riuscito (auth/internal-error).',
    );
    expect(describeAuthError('')).toBe('Accesso non riuscito.');
  });
});
