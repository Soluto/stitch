import { GraphQLFieldResolverParams } from 'apollo-server-types';
import { RequestContext } from '../context';
import { inject } from './arguments-injection';

interface TestCase {
  input: unknown;
  params: GraphQLFieldResolverParams<unknown, Pick<RequestContext, 'request' | 'exports' | 'request'>>
  expected: unknown;
}

const testCases: [string, TestCase][] = [
  [
    'From source',
    {
      input: '{source.id}',
      params: {
        source: { id: '1' },
        args: {},
        context: {} as any,
        info: ({} as unknown) as any,
      },
      expected: '1',
    },
  ],
  [
    'From args',
    {
      input: '{args.isWorking}',
      params: {
        source: null,
        args: { isWorking: true },
        context: {} as any,
        info: ({} as unknown) as any,
      },
      expected: true,
    },
  ],
  [
    'From headers',
    {
      input: '{headers["x-client-id"]}',
      params: {
        source: null,
        args: {},
        context: {
          request: {
            isAnonymousAccess: () => false,
            headers: {
              'x-client-id': 'some-service',
            },
            decodeJWT(): undefined {
              return;
            },
          },
          exports: { resolve: () => ({}) },
        },
        info: ({} as unknown) as any,
      },
      expected: 'some-service',
    },
  ],
  [
    'From JWT',
    {
      input: '{jwt.email}',
      params: {
        source: null,
        args: {},
        context: {
          request: {
            isAnonymousAccess: () => false,
            headers: {},
            decodeJWT() {
              return {
                header: {},
                payload: { email: 'something@domain.com' },
                signature: '',
              };
            },
          },
          exports: { resolve: () => ({}) },
        },
        info: ({} as unknown) as any,
      },
      expected: 'something@domain.com',
    },
  ],
  [
    'From isAnonymousAccess',
    {
      input: '{isAnonymousAccess}',
      params: {
        source: null,
        args: {},
        context: {
          request: {
            isAnonymousAccess: () => true,
            headers: {},
            decodeJWT(): undefined {
              return;
            },
          },
          exports: { resolve: () => ({}) },
        },
        info: ({} as unknown) as any,
      },
      expected: true,
    },
  ],
  [
    'Deep inject object that contains objects and arrays',
    {
      input: {
        obj: { f1: 'v1', arg: '{args.argKey}' },
        arr: ['first', '{source.srcKey}'],
        inj: '{args.argKey}',
        static: 42,
      },
      params: {
        source: { srcKey: 'srcVal' },
        args: { argKey: 'argVal' },
        context: {} as any,
        info: ({} as unknown) as any,
      },
      expected: {
        obj: { f1: 'v1', arg: 'argVal' },
        arr: ['first', 'srcVal'],
        inj: 'argVal',
        static: 42,
      },
    },
  ],
  [
    'Deep inject array that contains objects and arrays',
    {
      input: [{ f1: 'v1', arg: '{args.argKey}' }, ['first', '{source.srcKey}'], '{args.argKey}', 42],
      params: {
        source: { srcKey: 'srcVal' },
        args: { argKey: 'argVal' },
        context: {} as any,
        info: ({} as unknown) as any,
      },
      expected: [{ f1: 'v1', arg: 'argVal' }, ['first', 'srcVal'], 'argVal', 42],
    },
  ],
];

describe('Argument Injection Tests', () => {
  test.each(testCases)('%s', (_, { input, params, expected }) => {
    const result = inject(input, params);
    expect(result).toEqual(expected);
  });
});
