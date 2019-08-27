// workaround to load tsconfig for mocha tests
require('ts-node').register({
    project: './tsconfig.json',
});