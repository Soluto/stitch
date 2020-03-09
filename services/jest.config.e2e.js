module.exports = {
    projects: [
        {
            displayName: 'End-to-End Tests',
            roots: ['<rootDir>/src/tests/e2e'],
            testTimeout: 30000,
            testEnvironment: '<rootDir>/src/tests/e2e/jest-e2e-environment.js',
            runner: '<rootDir>/src/tests/e2e/jest-e2e-runner.js',
            testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
            transform: {
                '^.+\\.(ts|tsx)$': 'ts-jest',
            },
        },
    ],
};
