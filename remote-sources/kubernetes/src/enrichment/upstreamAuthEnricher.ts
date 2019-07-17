import k8s = require("@kubernetes/client-node");
import config from "../config";
import { UpstreamClientCredentialsConfig } from "../object-types";

const k8sConfig = new k8s.KubeConfig();
k8sConfig.loadFromCluster();

const client = k8sConfig.makeApiClient(k8s.CoreV1Api);

export default async (
    upstreamAuth: UpstreamClientCredentialsConfig
): Promise<UpstreamClientCredentialsConfig> => {
    if (typeof upstreamAuth.clientSecret === "string") {
        return upstreamAuth;
    }

    const { secretName, key } =
        upstreamAuth.clientSecret &&
        upstreamAuth.clientSecret.valueFrom &&
        upstreamAuth.clientSecret.valueFrom.secretKeyRef;

    if (key && secretName) {
        const secret = await client.readNamespacedSecret(
            secretName,
            config.namespace
        );
        const secretValueBase64 = secret.body.data[key];
        const secretValue = Buffer.from(secretValueBase64, "base64").toString(
            "utf8"
        );
        const enrichedUpstreamAuth = { ...upstreamAuth, clientSecret: secretValue };
        return enrichedUpstreamAuth;
    }

    console.warn(`Something wrong with ${upstreamAuth.type} for ${upstreamAuth.authority} authentication provider...`);
    return upstreamAuth;
};
