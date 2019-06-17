import k8s = require("@kubernetes/client-node");
import config from "../config";

const k8sConfig = new k8s.KubeConfig();
k8sConfig.loadFromCluster();

const client = k8sConfig.makeApiClient(k8s.CoreV1Api);

export default async (authProvider: any): Promise<any> => {
    if (typeof authProvider.client_secret === "string") {
        return authProvider;
    }

    const { secretName, key } = authProvider.client_secret &&
        authProvider.client_secret.valueFrom &&
        authProvider.client_secret.valueFrom.secretKeyRef;

    if (key && secretName) {
        const secret = await client.readNamespacedSecret(secretName, config.namespace);
        const secretValueBase64 = secret.body.data[key];
        const secretValue = Buffer.from(secretValueBase64, "base64").toString("utf8");
        const enrichedAuthProvider = { ...authProvider, client_secret: secretValue };
        return enrichedAuthProvider;
    }

    console.log("Something wrong with authProvider...");
    return authProvider;
};