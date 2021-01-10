module.exports = {
  projects: [
    {
      displayName: 'BlackBox Tests',
      preset: 'ts-jest',
      rootDir: '.',
      setupFiles: ['<rootDir>/tests/blackbox/setup.js'],
      testTimeout: 60000,
      testMatch: ['<rootDir>/tests/blackbox/**/*.spec.ts'],
      testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
    },
  ],
};
