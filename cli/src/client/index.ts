import { GraphQLClient } from 'graphql-request';
import { BasePolicyInput, ResourceGroupInput } from './types';

const UploadResourceGroupMutation = `
mutation UploadResources($resourceGroup: ResourceGroupInput!) {
    result: updateResourceGroup(input: $resourceGroup) {
        success
    }
}`;

const ValidateResourceGroupQuery = `
query ValidateResources($resourceGroup: ResourceGroupInput!) {
    result: validateResourceGroup(input: $resourceGroup) {
        success
    }
}`;

const UploadBasePolicyMutation = `
mutation UploadBasePolicyMutation($basePolicy: BasePolicyInput!) {
    result: updateBasePolicy(input: $basePolicy) {
        success
    }
}`;

const ValidateBasePolicyQuery = `
query ValidateBasePolicyQuery($basePolicy: BasePolicyInput!) {
    result: validateBasePolicy(input: $basePolicy) {
        success
    }
}`;

function initClient(options: { registryUrl: string; dryRun?: boolean; authorizationHeader?: string }) {
  const clientOptions = { timeout: 10000, headers: {} as { [name: string]: string } };
  if (typeof options.authorizationHeader !== 'undefined') {
    clientOptions.headers['Authorization'] = options.authorizationHeader;
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
  }
) {
  const registryClient = initClient(options);

  const query = options.dryRun ? ValidateResourceGroupQuery : UploadResourceGroupMutation;

  try {
    const data = await registryClient.request<{ result: boolean }>(query, { resourceGroup: rg });
    console.log(data.result);
  } catch (err) {
    console.log('FAILURE');
    throw err;
  }
}

export async function uploadBasePolicy(
  basePolicy: BasePolicyInput,
  options: {
    registryUrl: string;
    dryRun?: boolean;
    authorizationHeader?: string;
  }
) {
  const registryClient = initClient(options);

  const query = options.dryRun ? ValidateBasePolicyQuery : UploadBasePolicyMutation;

  try {
    const data = await registryClient.request<{ result: boolean }>(query, { basePolicy });
    console.log(data.result);
  } catch (err) {
    console.log('FAILURE');
    throw err;
  }
}

export * from './types';
