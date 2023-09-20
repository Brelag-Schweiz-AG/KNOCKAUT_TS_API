module.exports = {
  parser: '@typescript-eslint/parser',
  root: true,
  env: {
    node: true,
  },
  extends: ['prettier'],
  plugins: ['prettier'],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],
    // prettier sometimes adds trailing whitespace, using eslint to remove
    'no-trailing-spaces': 'error',
  },
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      modules: true,
    },
  },
}
