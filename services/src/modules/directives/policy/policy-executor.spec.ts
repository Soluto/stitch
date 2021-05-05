import { GraphQLResolveInfo } from 'graphql';
import { when } from 'jest-when';
import logger from '../../logger';
import {
  PolicyArgsDefinitions,
  PolicyArgsObject,
  PolicyDefinition,
  PolicyType,
  ResourceMetadata,
} from '../../resource-repository';
import { Policy, PolicyEvaluationContext } from './types';

interface TestCase {
  policyArgs?: PolicyArgsObject;
  policyArgsDefinitions?: PolicyArgsDefinitions;
  expectedArgs?: Record<string, unknown>;
  shouldThrow?: boolean;
}

const testCases: [string, TestCase][] = [
  [
    'Without args',
    {
      expectedArgs: {},
    },
  ],
  [
    'Empty args',
    {
      policyArgs: {},
      policyArgsDefinitions: {},
      expectedArgs: {},
    },
  ],
  [
    'One required arg. Has value',
    {
      policyArgs: { arg1: 'Hello' },
      policyArgsDefinitions: { arg1: { type: 'String!' } },
      expectedArgs: { arg1: 'Hello' },
    },
  ],
  [
    'One required arg. Has no value',
    {
      policyArgs: {},
      policyArgsDefinitions: { arg1: { type: 'String!' } },
      shouldThrow: true,
    },
  ],
  [
    'One required arg. Has null value',
    {
      policyArgs: { arg1: null },
      policyArgsDefinitions: { arg1: { type: 'String!' } },
      expectedArgs: { arg1: null },
    },
  ],
  [
    'One required arg. Has undefined value',
    {
      policyArgs: { arg1: undefined },
      policyArgsDefinitions: { arg1: { type: 'String!' } },
      shouldThrow: true,
    },
  ],
  [
    'One optional arg. Has no value',
    {
      policyArgs: {},
      policyArgsDefinitions: { arg1: { type: 'String', optional: true } },
      expectedArgs: { arg1: null },
    },
  ],
  [
    'One optional arg. Has no value and default',
    {
      policyArgs: {},
      policyArgsDefinitions: { arg1: { type: 'String', default: 'Hey', optional: true } },
      expectedArgs: { arg1: 'Hey' },
    },
  ],
  [
    'One required arg. Has no value and default',
    {
      policyArgs: {},
      policyArgsDefinitions: { arg1: { type: 'String!', default: 'Hey' } },
      expectedArgs: { arg1: 'Hey' },
    },
  ],
  [
    'One required arg. Has value and default',
    {
      policyArgs: { arg1: 'Hello' },
      policyArgsDefinitions: { arg1: { type: 'String!', default: 'Hey' } },
      expectedArgs: { arg1: 'Hello' },
    },
  ],
  [
    'Two arguments',
    {
      policyArgs: { arg1: 'Hello' },
      policyArgsDefinitions: { arg1: { type: 'String!' }, arg2: { type: 'String!', default: 'World' } },
      expectedArgs: { arg1: 'Hello', arg2: 'World' },
    },
  ],
  [
    'Two arguments with injected values',
    {
      policyArgs: { arg1: '{ "H" + "I" }' },
      policyArgsDefinitions: { arg1: { type: 'String!' }, arg2: { type: 'String!', default: 'W{1-1}rld' } },
      expectedArgs: { arg1: 'HI', arg2: 'W0rld' },
    },
  ],
];

const typedUndefined = <T>() => (undefined as unknown) as T;

describe('Policy Executor', () => {
  const policyMetadata: ResourceMetadata = {
    namespace: 'policy-executor-test',
    name: 'policy',
  };

  const opaEvaluateMock = jest.fn();

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it.each(testCases)('%s', async (_, { policyArgs, policyArgsDefinitions, expectedArgs, shouldThrow }) => {
    const ctx: PolicyEvaluationContext = {
      ...policyMetadata,
      args: expectedArgs,
      query: undefined,
      policyAttachments: typedUndefined(),
    };

    when(opaEvaluateMock)
      .mockReturnValue({ done: true, allow: false })
      .calledWith(ctx)
      .mockReturnValue({ done: true, allow: true });
    jest.mock('./opa', () => ({
      evaluate: opaEvaluateMock,
    }));

    const { default: PolicyExecutor } = await import('./policy-executor');

    const executor = new PolicyExecutor();

    const policy: Policy = {
      ...policyMetadata,
      args: policyArgs,
    };

    const policyDefinition: PolicyDefinition = {
      metadata: policyMetadata,
      type: PolicyType.opa,
      code: 'Some code',
      args: policyArgsDefinitions,
    };

    const context = {
      resourceGroup: {
        policies: [policyDefinition],
      },
    } as any;

    const info = ({
      parentType: {
        name: 'Foo',
      },
      fieldName: 'bar',
    } as unknown) as GraphQLResolveInfo;

    try {
      const result = await executor.evaluatePolicy(policy, typedUndefined(), typedUndefined(), context, info, logger);
      expect(result).toBeTruthy();
      expect(shouldThrow).not.toBeTruthy();
    } catch (err) {
      expect(shouldThrow).toBeTruthy();
      expect(err).toMatchSnapshot();
    }
  });
});
