module.exports = {
  projects: [
    {
      displayName: 'Unit Tests',
      preset: 'ts-jest',
      rootDir: '.',
      setupFiles: ['<rootDir>/setup-unit-tests.js'],
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/tests'],
    },
    {
      displayName: 'Integration Tests',
      preset: 'ts-jest',
      rootDir: '.',
      setupFiles: ['<rootDir>/tests/integration/setup.js'],
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.spec.ts'],
      testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
    },
  ],
  testTimeout: 60000,
};
