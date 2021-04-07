module.exports = {
  projects: [
    {
      displayName: 'BlackBox Tests',
      preset: 'ts-jest',
      rootDir: '.',
      setupFiles: ['<rootDir>/tests/blackbox/setup.js'],
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/blackbox/**/*.spec.ts'],
      testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
      runner: '<rootDir>/tests/blackbox/jest-blackbox-runner.js',
    },
  ],
  testTimeout: 60000,
};
