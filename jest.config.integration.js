module.exports = {
    roots: ['<rootDir>/src/integration'],
    setupFiles: ['./setupJestIntegration.js'],
    testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },
};
