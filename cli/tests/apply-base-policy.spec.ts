/* eslint-disable promise/valid-params */
/* eslint-disable promise/catch-or-return */
import { expect, test } from '@oclif/test';

describe('Apply base policy', () => {
  test
    .nock('http://registry', api =>
      api.post('/graphql').reply(200, {
        data: {
          validateBasePolicy: {
            success: true,
          },
        },
      })
    )
    .stdout()
    .command([
      'apply:base-policy',
      '--dry-run',
      '--registry-url=http://registry/graphql',
      'tests/data/base-policy/base-policy.yaml',
    ])
    .it('Verify', ctx => {
      expect(ctx.stdout).to.contain('was verified successfully');
    });

  test
    .nock('http://registry', api => api.post('/graphql').delay(100).reply(200))
    .stdout()
    .stderr()
    .command([
      'apply:base-policy',
      '--dry-run',
      '--registry-url=http://registry/graphql',
      '--timeout=50',
      'tests/data/base-policy/base-policy.yaml',
    ])
    .catch((e: Error) => expect(e.message).contains('network timeout at: http://registry/graphql'), {
      raiseIfNotThrown: true,
    })
    .it('Timeout', () => {});
});
