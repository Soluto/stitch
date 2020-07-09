import { sign as signJwt } from 'jsonwebtoken';
import { FastifyRequest } from 'fastify';
import { RequestContext } from '../context';
import { inject } from './arguments-injection';
import getJwt from './request-context-jwt';

function createJwt(claims: { [k: string]: unknown }) {
  const request = {
    headers: {
      authorization: `Bearer ${signJwt(claims, 'secret')}`,
    },
  };
  return getJwt(request);
}

declare module '../context' {
  interface RequestContext {
    request: Pick<FastifyRequest, 'headers'>;
    jwt?: Record<string, unknown>;
  }
}

interface TestCase {
  template: string;
  source?: unknown;
  args?: Record<string, unknown>;
  context?: Pick<RequestContext, 'exports' | 'jwt'>;
  expected: unknown;
}

const testCases: [string, TestCase][] = [
  [
    'From source',
    {
      template: '{source.id}',
      source: { id: '1' },
      expected: '1',
    },
  ],
  [
    'From args',
    {
      template: '{args.isWorking}',
      args: { isWorking: true },
      expected: true,
    },
  ],
  [
    'From JWT',
    {
      template: '{jwt.email}',
      context: {
        jwt: createJwt({ email: 'something@domain.com' }),
        exports: { resolve: () => ({}) },
      },
      expected: 'something@domain.com',
    },
  ],
];

describe('Argument Injection Tests', () => {
  test.each(testCases)('%s', (_, { template, source, args, context, expected }) => {
    const result = inject(template, source, args, context);
    expect(result).toEqual(expected);
  });
});
