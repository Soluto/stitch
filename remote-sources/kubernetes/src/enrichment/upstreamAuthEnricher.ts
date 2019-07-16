import k8s = require('@kubernetes/client-node');
import config from '../config';
import {AgogosCustomResource, UpstreamClientCredentialsConfig} from '../object-types';

const k8sConfig = new k8s.KubeConfig();
k8sConfig.loadFromCluster();

const client = k8sConfig.makeApiClient(k8s.CoreV1Api);

export default async (
    resource: AgogosCustomResource<UpstreamClientCredentialsConfig>
): Promise<UpstreamClientCredentialsConfig> => {
    const {spec} = resource;
    if (typeof spec.clientSecret === 'string') {
        return spec;
    }

    const {secretName, key} = spec.clientSecret && spec.clientSecret.valueFrom && spec.clientSecret.valueFrom.secretRef;

    if (key && secretName) {
        const secret = await client.readNamespacedSecret(secretName, resource.metadata.namespace);
        const secretValueBase64 = secret.body.data[key];
        const secretValue = Buffer.from(secretValueBase64, 'base64').toString('utf8');

        const enrichedSpec = {...spec, clientSecret: secretValue};
        return enrichedSpec;
    }

    console.warn(
        `Failed enriching UpstreamClientCredentials: ${resource.metadata.namespace}/${
            resource.metadata.name
        }. Something is weird in it.`
    );
    return spec;
};
