import { LoadedPolicy } from '../directives/policy/types';

export interface ResourceGroup {
  schemas: Schema[];
  upstreams: Upstream[];
  upstreamClientCredentials: UpstreamClientCredentials[];
  policies: Policy[];
  // policyAttachments are compiled from the Rego code in opa policies, they are not directly modified by users
  policyAttachments?: PolicyAttachments;
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

export interface Policy extends Resource {
  type: PolicyType;
  code: string;
  args?: PolicyArgsObject;
  query?: PolicyQuery;
}

export interface PolicyQuery {
  gql: string;
  variables?: PolicyQueryVariables;
}

export interface PolicyQueryVariables {
  [key: string]: unknown;
}

export interface PolicyArgsObject {
  [name: string]: unknown;
}

export interface FetchLatestResult {
  isNew: boolean;
  resourceGroup: ResourceGroup;
}

export type PolicyAttachments = {
  [filename: string]: LoadedPolicy;
};

export interface IResourceRepository {
  fetchLatest(): Promise<FetchLatestResult>;
  update(rg: ResourceGroup): Promise<void>;
  writePolicyAttachment(filename: string, content: Buffer): Promise<void>;
}

enum AuthType {
  ActiveDirectory = 'ActiveDirectory',
}

export enum PolicyType {
  opa = 'opa',
}
