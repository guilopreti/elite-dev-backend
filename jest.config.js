/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.property.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
};

export default config;
