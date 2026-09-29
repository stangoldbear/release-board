import { describe, expect, it } from 'vitest';
import { readFirebaseConfig } from './config';

const full = {
  VITE_FIREBASE_API_KEY: 'key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo',
  VITE_FIREBASE_APP_ID: '1:2:web:3',
};

describe('readFirebaseConfig', () => {
  it('reads the four variables', () => {
    expect(readFirebaseConfig(full)).toEqual({
      apiKey: 'key',
      authDomain: 'demo.firebaseapp.com',
      projectId: 'demo',
      appId: '1:2:web:3',
    });
  });

  it('is null when a variable is missing or blank', () => {
    expect(readFirebaseConfig({})).toBeNull();
    expect(readFirebaseConfig({ ...full, VITE_FIREBASE_APP_ID: '  ' })).toBeNull();
    expect(readFirebaseConfig({ ...full, VITE_FIREBASE_PROJECT_ID: undefined })).toBeNull();
  });
});
