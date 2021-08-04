import { GraphQLClient, gql } from 'graphql-request';
import { BasePolicyInput, ResourceGroupInput } from './types';

export interface RequestInit {
  body?: BodyInit | null;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  headers?: HeadersInit;
  integrity?: string;
  keepalive?: boolean;
  method?: string;
  mode?: RequestMode;
  redirect?: RequestRedirect;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  signal?: AbortSignal | null;
  timeout?: number;
  window?: any;
  fetch?: any;
}

const UploadResourceGroupMutation = gql`
  mutation UploadResources($resourceGroup: ResourceGroupInput!) {
    result: updateResourceGroup(input: $resourceGroup) {
      success
    }
  }
`;

const ValidateResourceGroupQuery = gql`
  query ValidateResources($resourceGroup: ResourceGroupInput!) {
    result: validateResourceGroup(input: $resourceGroup) {
      success
    }
  }
`;

const UploadBasePolicyMutation = gql`
  mutation UploadBasePolicyMutation($basePolicy: BasePolicyInput!) {
    result: updateBasePolicy(input: $basePolicy) {
      success
    }
  }
`;

const ValidateBasePolicyQuery = gql`
  query ValidateBasePolicyQuery($basePolicy: BasePolicyInput!) {
    result: validateBasePolicy(input: $basePolicy) {
      success
    }
  }
`;

const UploadIntrospectionQueryPolicyMutation = gql`
  mutation UploadIntrospectionQueryPolicyMutation($introspectionQueryPolicy: BasePolicyInput!) {
    result: updateIntrospectionQueryPolicy(input: $introspectionQueryPolicy) {
      success
    }
  }
`;

const ValidateIntrospectionQueryPolicyQuery = gql`
  query ValidateIntrospectionQueryPolicyQuery($introspectionQueryPolicy: BasePolicyInput!) {
    result: validateIntrospectionQueryPolicy(input: $introspectionQueryPolicy) {
      success
    }
  }
`;

const RefreshRemoteSchemaMutation = gql`
  mutation RefreshRemoteSchemaMutation($url: String!) {
    result: refreshRemoteSchema(url: $url) {
      success
    }
  }
`;

function initClient(
  options: { registryUrl: string; dryRun?: boolean; authorizationHeader?: string },
  clientOptions: Partial<RequestInit>
) {
  if (typeof options.authorizationHeader !== 'undefined') {
    if (!clientOptions.headers) {
      clientOptions.headers = {};
    }
    (clientOptions.headers as Record<string, string>)['Authorization'] = options.authorizationHeader;
  }
  const registryClient = new GraphQLClient(options.registryUrl, clientOptions);
  return registryClient;
}

export async function uploadResourceGroup(
  rg: ResourceGroupInput,
  options: {
    registryUrl: string;
    dryRun?: boolean;
    authorizationHeader?: string;
  },
  clientOptions: Partial<RequestInit>
) {
  const registryClient = initClient(options, clientOptions);

  const query = options.dryRun ? ValidateResourceGroupQuery : UploadResourceGroupMutation;

  return registryClient.request<{ result: { success: boolean } }>(query, { resourceGroup: rg });
}

export async function uploadBasePolicy(
  basePolicy: BasePolicyInput,
  options: {
    registryUrl: string;
    dryRun?: boolean;
    authorizationHeader?: string;
  },
  clientOptions: Partial<RequestInit>
) {
  const registryClient = initClient(options, clientOptions);

  const query = options.dryRun ? ValidateBasePolicyQuery : UploadBasePolicyMutation;

  return registryClient.request<{ result: { success: boolean } }>(query, { basePolicy });
}

export async function uploadIntrospectionQueryPolicy(
  introspectionQueryPolicy: BasePolicyInput,
  options: {
    registryUrl: string;
    dryRun?: boolean;
    authorizationHeader?: string;
  },
  clientOptions: Partial<RequestInit>
) {
  const registryClient = initClient(options, clientOptions);

  const query = options.dryRun ? ValidateIntrospectionQueryPolicyQuery : UploadIntrospectionQueryPolicyMutation;

  return registryClient.request<{ result: { success: boolean } }>(query, { introspectionQueryPolicy });
}

export async function refreshRemoteSchema(
  url: string,
  options: {
    registryUrl: string;
    authorizationHeader?: string;
  },
  clientOptions: Partial<RequestInit>
) {
  const registryClient = initClient(options, clientOptions);

  const query = RefreshRemoteSchemaMutation;

  return registryClient.request<{ result: { success: boolean } }>(query, { url });
}

export * from './types';
