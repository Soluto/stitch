module.exports = {
  projects: [
    {
      displayName: 'End-to-End Tests',
      preset: 'ts-jest',
      rootDir: '.',
      testTimeout: 60000,
      testMatch: ['<rootDir>/tests/e2e/**/*.spec.ts'],
      testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
      runner: '<rootDir>/tests/e2e/jest-e2e-runner.js',
    },
  ],
};
