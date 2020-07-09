import * as jwtUtil from 'jsonwebtoken';
import getJwt from './request-context-jwt';

describe('Request context JWT', () => {
  test('Jwt is parsed once', () => {
    const name = 'John Smith';
    const email = 'john.smith@domain.com';
    const payload = { name, email };
    const jwt = jwtUtil.sign(payload, 'secret');
    const request = {
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    };

    const result: Record<string, unknown> = getJwt(request);

    const spy = jest.spyOn(jwtUtil, 'decode');
    expect(result.name).toEqual(name);
    expect(result.email).toEqual(email);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
