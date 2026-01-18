module.exports = {
  env: {
    browser: true,
    node: true,
    es2022: true
  },
  globals: {
    marked: 'readonly'
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'warn',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],
    curly: ['error', 'all'],
    semi: ['error', 'always'],
    quotes: ['error', 'single', { avoidEscape: true }],
    'comma-dangle': ['error', 'never'],
    indent: ['error', 2, { SwitchCase: 1 }],
    'no-trailing-spaces': 'error',
    'eol-last': ['error', 'always']
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      env: {
        node: true
      },
      globals: {
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly'
      }
    },
    {
      files: ['main.js', 'preload.js'],
      env: {
        node: true,
        browser: false
      }
    },
    {
      files: ['renderer/**/*.js'],
      env: {
        browser: true,
        node: false
      }
    }
  ]
};
