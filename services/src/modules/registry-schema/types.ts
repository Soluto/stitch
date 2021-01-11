// Importing directly from types because of a typescript or ts-jest bug that re-exported enums cause a runtime error for being undefined
// https://github.com/kulshekhar/ts-jest/issues/281
import {
  PolicyType,
  PolicyQueryVariables,
  PolicyArgsObject,
  PolicyArgsDefinitions,
} from '../resource-repository/types';

export interface ResourceMetadataInput {
  namespace: string;
  name: string;
}

export interface ResourceGroupMetadataInput {
  schemas?: ResourceMetadataInput[];
  upstreams?: ResourceMetadataInput[];
  upstreamClientCredentials?: ResourceMetadataInput[];
  policies?: ResourceMetadataInput[];
  basePolicy?: boolean;
  defaultUpstream?: boolean;
}

export type DefaultUpstreamInput = Omit<UpstreamInput, 'metadata' | 'host' | 'sourceHosts'>;

export interface ResourceGroupInput {
  schemas?: SchemaInput[];
  upstreams?: UpstreamInput[];
  upstreamClientCredentials?: UpstreamClientCredentialsInput[];
  policies?: PolicyInput[];
  basePolicy?: BasePolicyInput;
  defaultUpstream?: DefaultUpstreamInput;
}

export interface SchemaInput {
  metadata: ResourceMetadataInput;
  schema: string;
}

export enum AuthType {
  ActiveDirectory = 'ActiveDirectory',
}

interface ActiveDirectoryAuthInput {
  authority: string;
  resource: string;
}

export interface UpstreamInput {
  metadata: ResourceMetadataInput;
  fromTemplate?: ResourceMetadataInput;
  isTemplate?: boolean;
  host?: string;
  sourceHosts?: string[];
  targetOrigin?: string;
  auth?: {
    type: AuthType;
    activeDirectory: ActiveDirectoryAuthInput;
  };
  headers?: {
    name: string;
    value: string;
  }[];
}

export interface UpstreamClientCredentialsInput {
  metadata: ResourceMetadataInput;
  authType: AuthType;
  activeDirectory: {
    authority: string;
    clientId: string;
    clientSecret: string;
  };
}

interface PolicyQueryInput {
  gql: string;
  variables?: PolicyQueryVariables;
}

export interface PolicyInput {
  metadata: ResourceMetadataInput;
  type: PolicyType;
  shouldOverrideBasePolicy?: boolean;
  code: string;
  args?: PolicyArgsDefinitions;
  query?: PolicyQueryInput;
}

export interface BasePolicyInput {
  namespace: string;
  name: string;
  args?: PolicyArgsObject;
}
