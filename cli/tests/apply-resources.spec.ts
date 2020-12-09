/* eslint-disable promise/valid-params */
/* eslint-disable promise/catch-or-return */
import { expect, test } from '@oclif/test';

describe('Apply resources', () => {
  test
    .nock('http://registry', api =>
      api.post('/graphql').reply(200, {
        data: {
          validateResourceGroup: {
            success: true,
          },
        },
      })
    )
    .stdout()
    .command([
      'apply:resources',
      '--dry-run',
      '--registry-url=http://registry/graphql',
      '--skip-resource-types=upstreams,upstreamClientCredentials',
      'tests/resources',
    ])
    .it('Verify', ctx => {
      expect(ctx.stdout).to.contain('schemas: 2');
      expect(ctx.stdout).to.contain('policies: 1');
      expect(ctx.stdout).to.contain('upstreams: 1 - Skipped');
      expect(ctx.stdout).to.contain('upstreamClientCredentials: 0 - Skipped');
      expect(ctx.stdout).to.contain('were verified successfully');
    });

  test
    .nock('http://registry', api => api.post('/graphql').delay(100).reply(200))
    .stdout()
    .stderr()
    .command([
      'apply:resources',
      '--dry-run',
      '--registry-url=http://registry/graphql',
      '--timeout=50',
      'tests/resources',
    ])
    .catch((e: Error) => expect(e.message).contains('network timeout at: http://registry/graphql'), {
      raiseIfNotThrown: true,
    })
    .it('Timeout', () => {});
});
