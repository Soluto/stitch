module.exports = {
    projects: [
        {
            displayName: 'Unit Tests',
            roots: ['<rootDir>/src'],
            testPathIgnorePatterns: ['/node_modules/', '/src/integration', '/src/e2e'],
            setupFiles: ['./setupJestUnit.js'],
            testEnvironment: 'node',
            testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
            transform: {
                '^.+\\.(ts|tsx)$': 'ts-jest',
            },
        },
        {
            displayName: 'Integration Tests',
            roots: ['<rootDir>/src/integration'],
            setupFiles: ['./src/integration/setup.js'],
            testEnvironment: 'node',
            testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
            transform: {
                '^.+\\.(ts|tsx)$': 'ts-jest',
            },
        },
    ],
};
