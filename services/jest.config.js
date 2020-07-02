module.exports = {
  projects: [
    {
      displayName: 'Unit Tests',
      preset: 'ts-jest',
      rootDir: '.',
      setupFiles: ['<rootDir>/setup-jest-unit.js'],
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/src/tests'],
      testTimeout: 60000,
    },
    {
      displayName: 'Integration Tests',
      preset: 'ts-jest',
      rootDir: '.',
      setupFiles: ['<rootDir>/src/tests/integration/setup.js'],
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/tests/integration/**/*.spec.ts'],
      testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
      testTimeout: 60000,
    },
  ],
};
