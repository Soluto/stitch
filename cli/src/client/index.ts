import {GraphQLClient} from 'graphql-request';
import {ResourceGroupInput} from './types';

const UploadResourceGroupMutation = `
mutation UploadResources($resourceGroup: ResourceGroupInput!) {
    updateResourceGroup(input: $resourceGroup) {
        success
    }
}
`;
export async function uploadResourceGroup(registryUrl: string, rg: ResourceGroupInput) {
    const registryClient = new GraphQLClient(registryUrl, {timeout: 10000} as any);

    try {
        const data = await registryClient.request(UploadResourceGroupMutation, {resourceGroup: rg});
        if (data?.updateResourceGroup?.success) {
            console.log('Apply resources SUCCESS', data?.updateResourceGroup?.success);
        }
    } catch (err) {
        console.log('FAILURE applying resources!');
        throw err;
    }
}

const ValidateResourceGroupMutation = `
query ValidateResources($resourceGroup: ResourceGroupInput!) {
    validateResourceGroup(input: $resourceGroup) {
        success
    }
}
`;
export async function validateResourceGroup(registryUrl: string, rg: ResourceGroupInput) {
    const registryClient = new GraphQLClient(registryUrl, {timeout: 10000} as any);

    try {
        const data = await registryClient.request(ValidateResourceGroupMutation, {resourceGroup: rg});
        if (data?.validateResourceGroup?.success) {
            console.log('Validation SUCCESS', data?.validateResourceGroup?.success);
        }
    } catch (err) {
        console.log('Validation FAILURE');
        throw err;
    }
}
