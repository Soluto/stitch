import { valueFromASTUntyped } from 'graphql';
import { ApolloServerPlugin } from 'apollo-server-plugin-base';
import { GraphQLFieldResolverParams } from 'apollo-server-types';
import { RequestContext } from '../context';
import { Policy } from '../directives/policy/types';
import { getPolicyDefinition } from '../directives/policy/policy-executor';
import PolicyExecutionFailedError from '../directives/policy/policy-execution-failed-error';

export function createBasicPolicyPlugin(): ApolloServerPlugin {
  return {
    requestDidStart: async () => ({
      executionDidStart: async () => ({
        willResolveField(
          fieldResolverParams: GraphQLFieldResolverParams<unknown, RequestContext, Record<string, unknown>>
        ): ((error: Error | null, result?: unknown) => void) | void {
          const { source, args, context, info } = fieldResolverParams;
          const { basePolicy, policies } = context.resourceGroup;
          if (!basePolicy) return;

          const fieldDirectives = info.parentType.getFields()[info.fieldName].astNode?.directives;
          const fieldPolicyDirectives = fieldDirectives?.filter(d => d.name.value === 'policy') ?? [];

          const shouldOverrideBasePolicy = fieldPolicyDirectives.some(d => {
            const args = d.arguments!.reduce(
              (acc, an) => ({ ...acc, [an.name.value]: valueFromASTUntyped(an.value) }),
              {}
            ) as Policy;
            const policyDefinition = getPolicyDefinition(policies, args.namespace, args.name);
            if (!policyDefinition) {
              throw new PolicyExecutionFailedError(
                { namespace: args.namespace, name: args.name },
                `The base policy definition was not found`,
                info.parentType.name,
                info.fieldName
              );
            }
            return policyDefinition.shouldOverrideBasePolicy ?? false;
          });

          if (!shouldOverrideBasePolicy) {
            context.policyExecutor.validatePolicySync(basePolicy, source, args, context, info);
          }
        },
      }),
    }),
  };
}
