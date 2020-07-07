import { GraphQLResolveInfo } from 'graphql';
import { Policy as PolicyDefinition, PolicyArgsObject, PolicyAttachments } from '../../resource-repository/types';
import { RequestContext } from '../../context';

export type Policy = {
  namespace: string;
  name: string;
  args?: PolicyArgsObject;
};

// args here contain the final values after param injection
export type PolicyEvaluationContext = {
  namespace: string;
  name: string;
  policyAttachments: PolicyAttachments;
  args?: PolicyArgsObject;
  query?: QueryResults;
};

export type QueryResults = {
  [name: string]: unknown;
};

export type PolicyEvaluationResult = {
  done: boolean;
  allow?: boolean;
  query?: {
    type: string;
    code: string;
  };
};

export interface PolicyResult {
  allow: boolean;
}

export type GraphQLArguments = {
  [name: string]: unknown;
};

export type PolicyDirectiveExecutionContext = {
  policy: Policy;
  parent: unknown;
  gqlArgs: GraphQLArguments;
  requestContext: RequestContext;
  info: GraphQLResolveInfo;
  policyDefinition: PolicyDefinition;
};
