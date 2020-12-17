import { RemoteSchema } from '../directives/gql';
import { Policy, LoadedPolicy } from '../directives/policy/types';

export type PolicyAttachments = Record<string, LoadedPolicy>;
export type PolicyQueryVariables = Record<string, unknown>;
export type PolicyArgsObject = Record<string, unknown>;

export interface ResourceGroup {
  schemas: Schema[];
  upstreams: Upstream[];
  upstreamClientCredentials: UpstreamClientCredentials[];
  policies: PolicyDefinition[];
  // policyAttachments are compiled from the Rego code in opa policies, they are not directly modified by users
  policyAttachments?: PolicyAttachments;
  basePolicy?: Policy;
  remoteSchemas?: RemoteSchema[];
}

export interface Resource {
  metadata: ResourceMetadata;
}

export interface ResourceMetadata {
  namespace: string;
  name: string;
}

export interface Schema extends Resource {
  schema: string;
}

export interface Upstream extends Resource {
  host: string;
  auth: {
    type: AuthType;
    activeDirectory: {
      authority: string;
      resource: string;
    };
  };
}

export interface UpstreamClientCredentials extends Resource {
  authType: AuthType;
  activeDirectory: {
    authority: string;
    clientId: string;
    clientSecret: string;
  };
}

export interface PolicyDefinition extends Resource {
  type: PolicyType;
  code: string;
  args?: PolicyArgsObject;
  query?: PolicyQuery;
  shouldOverrideBasePolicy?: boolean;
}

export interface PolicyQuery {
  gql: string;
  variables?: PolicyQueryVariables;
}

export interface FetchLatestResult {
  isNew: boolean;
  resourceGroup: ResourceGroup;
}

export type UpdateOptions = { registry: boolean };

export interface IResourceRepository {
  fetchLatest(): Promise<FetchLatestResult>;
  update(rg: ResourceGroup, options?: UpdateOptions): Promise<void>;
  writePolicyAttachment(filename: string, content: Buffer): Promise<void>;
}

enum AuthType {
  ActiveDirectory = 'ActiveDirectory',
}

export enum PolicyType {
  opa = 'opa',
}
