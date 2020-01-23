module.exports = {
    roots: ['<rootDir>/src'],
    testPathIgnorePatterns: ['/node_modules/', '/src/integration'],
    setupFiles: ['./setupJest.js'],
    testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },
};
