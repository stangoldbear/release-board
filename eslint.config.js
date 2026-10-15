import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      // `const { id, ...rest } = item` is the usual way to leave a field out.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      // Newer browsers return a promise from the scroll methods: an effect written as an arrow
      // that returns one hands React a cleanup that is not a function, and the page goes blank.
      'no-restricted-syntax': [
        'error',
        ...['CallExpression', 'ChainExpression > CallExpression'].map((call) => ({
          selector: `CallExpression[callee.name=/^use(Layout|Insertion)?Effect$/] > ArrowFunctionExpression[expression=true] > ${call}[callee.property.name=/^scroll(To|By|IntoView)?$/]`,
          message: 'Scroll inside a block: `useEffect(() => { el.scrollTo(…); })`.',
        })),
      ],
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
]);
