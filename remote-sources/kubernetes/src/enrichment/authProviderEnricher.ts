import k8s = require("@kubernetes/client-node");
import config from "../config";
import { GqlAuthProviderConfig } from "../object-types";

const k8sConfig = new k8s.KubeConfig();
k8sConfig.loadFromCluster();

const client = k8sConfig.makeApiClient(k8s.CoreV1Api);

export default async (authProvider: GqlAuthProviderConfig): Promise<GqlAuthProviderConfig> => {
    if (typeof authProvider.clientSecret === "string") {
        return authProvider;
    }

    const { secretName, key } = authProvider.clientSecret &&
        authProvider.clientSecret.valueFrom &&
        authProvider.clientSecret.valueFrom.secretKeyRef;

    if (key && secretName) {
        const secret = await client.readNamespacedSecret(secretName, config.namespace);
        const secretValueBase64 = secret.body.data[key];
        const secretValue = Buffer.from(secretValueBase64, "base64").toString("utf8");
        const enrichedAuthProvider = { ...authProvider, clientSecret: secretValue };
        return enrichedAuthProvider;
    }

    console.warn(`Something wrong with ${authProvider.type} for ${authProvider.authority} authentication provider...`);
    return authProvider;
};