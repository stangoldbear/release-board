import { defineConfig } from 'vitest/config';
import baseConfig from './vite.config.ts';

/**
 * Tests that need the Firestore emulator: security rules and the Firestore adapters. They run
 * with `npm run test:rules`, which starts the emulator, or wherever FIRESTORE_EMULATOR_HOST is set.
 */
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['src/**/*.emulator.test.ts'],
    exclude: ['**/node_modules/**'],
    // The tests share one emulator and clear it between files.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
