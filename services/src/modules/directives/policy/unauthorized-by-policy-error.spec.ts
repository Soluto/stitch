import UnauthorizedByPolicyError from './unauthorized-by-policy-error';

describe('Unauthorized by policy', () => {
  test('For @policy directive', () => {
    const error = new UnauthorizedByPolicyError({ namespace: 'ns', name: 'policy' });
    expect(error).toMatchSnapshot();
  });

  test('For @policies directive', () => {
    const error = new UnauthorizedByPolicyError([
      new UnauthorizedByPolicyError({ namespace: 'ns-1', name: 'policy-1' }),
      new UnauthorizedByPolicyError({ namespace: 'ns-2', name: 'policy-2' }),
    ]);
    expect(error).toMatchSnapshot();
  });
});
