module.exports = {
    projects: [
        {
            displayName: 'Unit Tests',
            roots: ['<rootDir>/src'],
            testPathIgnorePatterns: ['/node_modules/', '/src/integration'],
            setupFiles: ['./setupJestUnit.js'],

            testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
            transform: {
                '^.+\\.(ts|tsx)$': 'ts-jest',
            },
        },
        {
            displayName: 'Integration Tests',
            roots: ['<rootDir>/src/integration'],
            setupFiles: ['./setupJestIntegration.js'],

            testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
            transform: {
                '^.+\\.(ts|tsx)$': 'ts-jest',
            },
        },
    ],
};
