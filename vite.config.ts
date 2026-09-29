/// <reference types="vitest/config" />
import { execFileSync } from 'node:child_process';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

/** Short commit of the build: from CI when available, otherwise from the local git checkout. */
function buildCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'locale';
  }
}

export default defineConfig({
  // Relative asset paths: the same build works at a domain root and under /<repo>/ on GitHub Pages.
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    // The Firebase SDK, loaded only by configured instances, is one chunk of about 640 kB.
    chunkSizeWarningLimit: 700,
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_COMMIT__: JSON.stringify(buildCommit()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  test: {
    include: ['src/**/*.test.ts'],
    // Emulator tests have their own config: see vitest.emulator.config.ts.
    exclude: ['**/*.emulator.test.ts', '**/node_modules/**'],
    environment: 'node',
    // CSS is ignored in tests, except the tokens that a test compares with the themes.
    css: { include: [/tokens\.css/] },
    // Dates are checked in the time zone of the app's users, where UTC-based mistakes show up.
    env: { TZ: 'Europe/Rome' },
  },
});
