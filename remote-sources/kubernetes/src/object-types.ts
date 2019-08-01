import k8s = require('@kubernetes/client-node');

export type SchemaConfig = {
    definition: string;
}

export type UpstreamConfig = {
    host: string;
    headers: Array<{
        name: string;
        value: string;
    }>;
    auth: {
        authType: string;
        authority: string;
        scope: string;
    };
}

export type UpstreamClientCredentialsConfig = {
    authType: string;
    authority: string;
    clientId: string;
    clientSecret:
    | string
    | {
        valueFrom: {
            secretKeyRef: {
                secretName: string;
                key: string;
            };
        };
    };
}

export type AgogosObjectConfig = SchemaConfig | UpstreamConfig | UpstreamClientCredentialsConfig;

export type AgogosCustomResource<T extends AgogosObjectConfig = AgogosObjectConfig> = k8s.KubernetesObject & {
    spec: T;
};
