/* eslint-disable promise/catch-or-return */
import { promises as fs, readFileSync } from 'fs';
import { join } from 'path';
import { expect, test, FancyTypes } from '@oclif/test';

const commandArgs = (testCaseName: string) => [
  'apply:resources',
  '--dry-run',
  '--registry-url=http://registry/graphql',
  '--skip-resource-types=upstreams,upstreamClientCredentials',
  '--verbose',
  join(__dirname, './data/apply-resources', testCaseName),
];

const nockCb = (testCaseName: string) => (api: FancyTypes.NockScope) =>
  api
    .post('/graphql', body => {
      const receivedSchema = body?.variables?.resourceGroup?.schemas?.[0]?.schema as string;
      const requestFile = join(__dirname, './requests/apply-resources', `${testCaseName}.gql`);
      const expectedSchema = readFileSync(requestFile, { encoding: 'utf8' });
      return receivedSchema === expectedSchema;
    })
    .reply(200, {
      data: {
        result: {
          success: true,
        },
      },
    });

async function runTestCase(testCaseName: string) {
  if (testCaseName.includes('error')) {
    describe(testCaseName, () => {
      test
        .stdout()
        .command(commandArgs(testCaseName))
        .catch(e => e.message.startsWith('Verifying resources failed'))
        .end('run command with error', ctx => {
          ctx.stdout.includes('Verifying resources failed');
        });
    });
  } else {
    describe(testCaseName, () => {
      test
        .nock('http://registry', nockCb(testCaseName))
        .stdout()
        .command(commandArgs(testCaseName))
        .end('run command', ctx => {
          ctx.stdout.includes('were verified successfully.');
          ctx.stdout.includes('schemas: 1');
          ctx.stdout.includes('upstreamClientCredentials: 0 - Skipped');
        });
    });
  }
}

describe('Apply resources', () => {
  let testCases: string[];

  before(async () => {
    testCases = await fs.readdir(join(__dirname, './data/apply-resources'));
    for (const testCase of testCases) {
      await runTestCase(testCase);
    }
  });

  it("Workaround - mocha doesn't support async describe", () => {
    expect(0).to.eq(0);
  });
});
