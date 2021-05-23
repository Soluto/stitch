import { gql } from 'apollo-server-core';
import { DocumentNode, graphql } from 'graphql';
import { injectArgs } from '../../arguments-injection';
import { RequestContext } from '../../context';
import { createChildLogger } from '../../logger';
import { PolicyQueryVariables, PolicyArgsObject, PolicyDefinition, ResourceMetadata } from '../../resource-repository';
import PolicyExecutionFailedError from './policy-execution-failed-error';
import { PolicyDirectiveExecutionContext, QueryResults } from './types';

export async function getQueryResult(
  ctx: PolicyDirectiveExecutionContext,
  args: PolicyArgsObject = {}
): Promise<QueryResults> {
  const query = ctx.policyDefinition.query;
  if (!query) return;

  const pqLogger = createChildLogger(ctx.logger, 'policy-query-executor');
  pqLogger.trace('Preparing policy query variables...');
  const variables = prepareVariables(args, query.variables);
  const requestContext: RequestContext = { ...ctx.requestContext, ignorePolicies: true };
  const gql = query.gql;
  pqLogger.trace({ variables }, 'Executing policy query...');

  const { data, errors } = await graphql(ctx.info.schema, gql, undefined, requestContext, variables).catch(error => {
    pqLogger.error({ error }, 'Policy query execution failed');
    throw new PolicyExecutionFailedError(
      ctx.policyDefinition.metadata,
      error,
      ctx.info.parentType.name,
      ctx.info.fieldName
    );
  });
  if (errors) {
    pqLogger.error({ errors }, 'Policy query execution failed');
    throw new PolicyExecutionFailedError(
      ctx.policyDefinition.metadata,
      'Policy query execution failed',
      ctx.info.parentType.name,
      ctx.info.fieldName
    );
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

export function buildPolicyQueryTypeDef(policy: PolicyDefinition): [string, DocumentNode] {
  const argStr = policy.args
    ? `(${Object.entries(policy.args)
        .map(([argName, { type, optional }]) => `${argName}: ${getPolicyQueryTypeDefArgType(type, optional)}`)
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

function getPolicyQueryTypeDefArgType(type: string, optional?: boolean) {
  if (type.endsWith('!') && optional) {
    return type.slice(0, -1);
  }
  return type;
}

declare module '../../context' {
  interface RequestContext {
    /**
     * This flag indicates that request should be resolved without invoking authorization policies evaluation
     */
    ignorePolicies: boolean;
  }
}
