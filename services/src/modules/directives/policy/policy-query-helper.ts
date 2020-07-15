import { graphql } from 'graphql';
import { PolicyArgsObject, PolicyQueryVariables } from '../../resource-repository';
import { injectArgs } from '../../arguments-injection';
import { RequestContext } from '../../context';
import { PolicyDirectiveExecutionContext, QueryResults } from './types';

export async function getQueryResult(
  ctx: PolicyDirectiveExecutionContext,
  args: PolicyArgsObject = {}
): Promise<QueryResults> {
  const query = ctx.policyDefinition.query;
  if (!query) return;

  const variables = prepareVariables(args, query.variables);
  return executeQuery(ctx, variables);
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

async function executeQuery(
  ctx: PolicyDirectiveExecutionContext,
  variables?: PolicyQueryVariables
): Promise<QueryResults> {
  const requestContext: RequestContext = { ...ctx.requestContext, ignorePolicies: true };
  const gql = ctx.policyDefinition.query!.gql;

  const gqlResult = await graphql(ctx.info.schema, gql, undefined, requestContext, variables);
  return gqlResult.data || undefined;
}

declare module '../../context' {
  interface RequestContext {
    /**
     * This flag indicates that request should be resolved without invoking authorization policies evaluation
     */
    ignorePolicies: boolean;
  }
}
