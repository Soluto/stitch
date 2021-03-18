import { print } from 'graphql';
import { PolicyArgsDefinitions, PolicyDefinition, PolicyType } from '../../resource-repository';
import { buildPolicyQueryTypeDef } from './policy-query-helper';

const policies: [string, PolicyArgsDefinitions?][] = [
  ['No args', undefined],
  [
    'Single mandatory arg',
    {
      arg1: {
        type: 'String!',
      },
    },
  ],
  [
    'Single optional arg',
    {
      arg1: {
        type: 'String',
        optional: true,
      },
    },
  ],
  [
    'Single optional arg with default',
    {
      arg1: {
        type: 'String',
        default: '{jwt.claim}',
        optional: true,
      },
    },
  ],
  [
    'Single mandatory arg with default',
    {
      arg1: {
        type: 'String!',
        default: 'hello',
        optional: true,
      },
    },
  ],
  [
    'Multiple argument',
    {
      arg1: {
        type: 'String!',
      },
      arg2: {
        type: 'Int',
        default: '{1}',
        optional: true,
      },
      arg3: {
        type: 'Boolean!',
        default: '{true}',
        optional: true,
      },
    },
  ],
];

describe('Policy query typedef', () => {
  test.each(policies)('%s', (name, args) => {
    const policyDefinition: PolicyDefinition = {
      metadata: {
        namespace: 'policy-query-typedef',
        name: name.toLowerCase().replace(/ /g, '_'),
      },
      type: PolicyType.opa,
      code: 'REGO code here',
      args,
    };

    const [policyQueryName, policyQueryTypeDef] = buildPolicyQueryTypeDef(policyDefinition);
    expect(print(policyQueryTypeDef)).toMatchSnapshot(policyQueryName);
  });
});
