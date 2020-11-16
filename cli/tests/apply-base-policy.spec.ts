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
      'tests/resources/base-policy.yaml',
    ])
    .it('Verify', ctx => {
      expect(ctx.stdout).to.contain('was verified successfully');
    });
});
