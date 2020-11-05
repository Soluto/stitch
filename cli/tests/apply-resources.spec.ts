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
    .command(['apply:resources', '--dry-run', '--registry-url=http://registry/graphql', 'tests/resources'])
    .it('Verify', ctx => {
      expect(ctx.stdout).to.contain('schemas: 1');
      expect(ctx.stdout).to.contain('policies: 1');
      expect(ctx.stdout).to.contain('were verified successfully');
    });
});
