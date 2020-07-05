module.exports = {
  projects: [
    {
      displayName: 'End-to-End Tests',
      preset: 'ts-jest',
      rootDir: '.',
      testTimeout: 60000,
      testEnvironment: '<rootDir>/src/tests/e2e/jest-e2e-environment.js',
      testMatch: ['<rootDir>/src/tests/e2e/tests/**/*.spec.ts'],
      testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
      runner: '<rootDir>/src/tests/e2e/jest-e2e-runner.js',
    },
  ],
};
