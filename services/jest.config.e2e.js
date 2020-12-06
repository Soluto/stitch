module.exports = {
  projects: [
    {
      displayName: 'End-to-End Tests',
      preset: 'ts-jest',
      rootDir: '.',
      setupFiles: ['<rootDir>/tests/e2e/setup.js'],
      testTimeout: 60000,
      testMatch: ['<rootDir>/tests/e2e/**/*.spec.ts'],
      testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/tests/e2e/ignore-policies/'],
      runner: '<rootDir>/tests/e2e/jest-e2e-runner.js',
    },
    {
      displayName: 'End-to-End Tests (Ignore policies)',
      preset: 'ts-jest',
      rootDir: '.',
      setupFiles: ['<rootDir>/tests/e2e/setup.js'],
      testTimeout: 60000,
      testMatch: ['<rootDir>/tests/e2e/ignore-policies/**/*.spec.ts'],
      testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
      runner: '<rootDir>/tests/e2e/jest-e2e-ignore-policies-runner.js',
    },
  ],
};
