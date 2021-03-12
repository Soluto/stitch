import { gql } from 'apollo-server-core';
import { graphql } from 'graphql';
import { injectArgs } from '../../arguments-injection';
import { RequestContext } from '../../context';
import logger from '../../logger';
import { PolicyQueryVariables, PolicyArgsObject, PolicyDefinition, ResourceMetadata } from '../../resource-repository';
import { PolicyDirectiveExecutionContext, QueryResults } from './types';

export async function getQueryResult(
  ctx: PolicyDirectiveExecutionContext,
  args: PolicyArgsObject = {}
): Promise<QueryResults> {
  const query = ctx.policyDefinition.query;
  if (!query) return;

  const pqLogger = logger.child({ metadata: ctx.policyDefinition.metadata });

  const variables = prepareVariables(args, query.variables);
  const requestContext: RequestContext = { ...ctx.requestContext, ignorePolicies: true };
  const gql = ctx.policyDefinition.query!.gql;
  pqLogger.trace({ variables }, 'Executing policy query...');
  const { data, errors } = await graphql(ctx.info.schema, gql, undefined, requestContext, variables);
  if (errors) {
    pqLogger.error({ errors }, 'Policy query execution failed');
    throw new Error('Policy query execution failed');
  }
  pqLogger.trace({ data }, 'Policy query executed');
  return data;
}

function prepareVariables(
  args: PolicyArgsObject = {},
  variables?: PolicyQueryVariables
): PolicyQueryVariables | undefined {
  if (!variables) return;

  return Object.entries(variables).reduce<PolicyQueryVariables>((policyArgs, [varName, varValue]) => {
    if (typeof varValue === 'string') {
      varValue = injectArgs(varValue, args);
    }
    policyArgs[varName] = varValue;
    return policyArgs;
  }, {});
}

function getPolicyQueryName({ namespace, name }: ResourceMetadata) {
  return `${namespace}___${name}`.replace(/-/g, '_');
}

export function buildPolicyQueryTypeDef(policy: PolicyDefinition) {
  const argStr = policy.args
    ? `(${Object.entries(policy.args)
        .map(([argName, { type }]) => `${argName}: ${type}`)
        .join(',')})`
    : '';

  const policyQueryName = getPolicyQueryName(policy.metadata);

  const policyQueryTypeDef = gql`
    extend type Policy {
        ${policyQueryName}${argStr}: PolicyResult!
          @policyQuery(namespace: "${policy.metadata.namespace}", name: "${policy.metadata.name}")
    }
  `;
  return [policyQueryName, policyQueryTypeDef];
}

declare module '../../context' {
  interface RequestContext {
    /**
     * This flag indicates that request should be resolved without invoking authorization policies evaluation
     */
    ignorePolicies: boolean;
  }
}
