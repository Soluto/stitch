import k8s = require('@kubernetes/client-node');

export interface ISchemaConfig {
    definition: string;
}

export interface IUpstreamConfig {
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

export interface IUpstreamClientCredentialsConfig {
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

export type AgogosObjectConfig = ISchemaConfig | IUpstreamConfig | IUpstreamClientCredentialsConfig;

export type AgogosCustomResource<T extends AgogosObjectConfig = AgogosObjectConfig> = k8s.KubernetesObject & {
    spec: T;
};
