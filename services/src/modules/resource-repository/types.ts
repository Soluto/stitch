import { RemoteSchema } from '../directives/gql';
import { Policy, LoadedPolicy } from '../directives/policy/types';
import { PluginMetadata } from '../plugins/types';

export type PolicyAttachments = Record<string, LoadedPolicy>;
export type PolicyQueryVariables = Record<string, unknown>;
export type PolicyArgsObject = Record<string, unknown>;
export type PolicyArgsDefinitions = Record<string, PolicyArgDefinition>;

export interface ResourceGroup {
  schemas: Schema[];
  upstreams: Upstream[];
  upstreamClientCredentials: UpstreamClientCredentials[];
  policies: PolicyDefinition[];
  // policyAttachments are compiled from the Rego code in opa policies, they are not directly modified by users
  policyAttachments?: PolicyAttachments;
  basePolicy?: Policy;
  defaultUpstream?: DefaultUpstream;
  remoteSchemas?: RemoteSchema[];
}

export interface Resource {
  metadata: ResourceMetadata;
}

export interface ResourceMetadata {
  namespace: string;
  name: string;
}

export interface ResourceGroupMetadata {
  schemas: ResourceMetadata[];
  upstreams: ResourceMetadata[];
  upstreamClientCredentials: ResourceMetadata[];
  policies: ResourceMetadata[];
  basePolicy: boolean;
  defaultUpstream: boolean;
}

export interface Schema extends Resource {
  schema: string;
}

export interface Upstream extends Resource {
  host?: string;
  sourceHosts?: string[];
  targetOrigin?: string;
  auth?: {
    type: AuthType;
    activeDirectory: {
      authority: string;
      resource: string;
    };
  };
  headers?: {
    name: string;
    value: string;
  }[];
}

export type DefaultUpstream = Omit<Upstream, 'metadata' | 'host' | 'sourceHosts'>;

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
  args?: PolicyArgsDefinitions;
  query?: PolicyQuery;
  shouldOverrideBasePolicy?: boolean;
}

export interface PolicyArgDefinition {
  type: string;
  default?: string;
  optional?: boolean;
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
  deletePolicyAttachment(filename: string): Promise<void>;
}

enum AuthType {
  ActiveDirectory = 'ActiveDirectory',
}

export enum PolicyType {
  opa = 'opa',
}

export interface ResourcesMetadata {
  checksum: string;
  summary: Record<string, number>;
  plugins?: PluginMetadata[];
}
