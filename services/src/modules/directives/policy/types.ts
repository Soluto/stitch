import { GraphQLResolveInfo } from 'graphql';
import { loadPolicy } from '@open-policy-agent/opa-wasm';
import {
  PolicyDefinition,
  ResourceMetadata,
  PolicyAttachments,
  PolicyArgsObject,
} from '../../resource-repository/types';
import { RequestContext } from '../../context';

export type QueryResults = Record<string, unknown> | null | undefined;

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
  source: unknown;
  gqlArgs: GraphQLArguments;
  requestContext: RequestContext;
  info: GraphQLResolveInfo;
  policyDefinition: PolicyDefinition;
};

export type PolicyCacheKey = {
  metadata: ResourceMetadata;
  args?: PolicyArgsObject;
};

// Unwrap the type that a Promise contains
type Await<T> = T extends {
  then(onfulfilled?: (value: infer U) => unknown): unknown;
}
  ? U
  : T;

export type LoadedPolicy = Await<ReturnType<typeof loadPolicy>>;
