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
            console.log('Success updating resource group!', data);
        }
    } catch (err) {
        console.log('FAILURE applying resources!');
        throw err;
    }
}
