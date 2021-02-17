/* eslint-disable promise/valid-params */
/* eslint-disable promise/catch-or-return */
import { expect, test } from '@oclif/test';

describe('Refresh remote schema', () => {
  test
    .nock('http://registry', api =>
      api.post('/graphql').reply(200, {
        data: {
          result: {
            success: true,
          },
        },
      })
    )
    .stdout()
    .command([
      'refresh:remote-schema',
      '--registry-url=http://registry/graphql',
      'http://remote-graphql-server/graphql',
    ])
    .it('Verify', ctx => {
      expect(ctx.stdout).to.contain('was refreshed successfully');
    });

  test
    .nock('http://registry', api => api.post('/graphql').delay(100).reply(200))
    .stdout()
    .stderr()
    .command([
      'refresh:remote-schema',
      '--registry-url=http://registry/graphql',
      '--timeout=50',
      'http://remote-graphql-server/graphql',
    ])
    .catch((e: Error) => expect(e.message).contains('network timeout at: http://registry/graphql'), {
      raiseIfNotThrown: true,
    })
    .it('Timeout', () => {});
});
