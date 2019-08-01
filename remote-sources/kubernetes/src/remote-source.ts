import k8s = require('@kubernetes/client-node');
import config from './config';
import enrich from './enrichment';
import { AgogosCustomResource, AgogosObjectConfig } from './object-types';
import Source from './source-type';

export default (client: k8s.CustomObjectsApi): Source => ({
    async getAgogosObjects(): Promise<{ [kind: string]: { [name: string]: AgogosObjectConfig } }> {
        const crds = await Promise.all(
            config.customResourceDefinitions.map(async kind => ({
                definition: await getAggObjectsByKind(kind, client),
                kind,
            }))
        );
        return crds.reduce((acc, o) => ({ ...acc, [o.kind]: o.definition }), {});
    },

    async putAgogosObject(name: string, kind: string, definition: AgogosObjectConfig): Promise<void> {
        throw new Error('Not implemented');
    },
});

const getAggObjectsByKind = async (kind: string, client: k8s.CustomObjectsApi): Promise<{ [name: string]: string }> => {
    const response = await client.listClusterCustomObject(config.apiGroup, config.apiVersion, kind);
    const enrichedDefinitions: Array<{ name: string; definition: AgogosObjectConfig }> = await Promise.all(
        response.body.items.map(async (resource: AgogosCustomResource<AgogosObjectConfig>) => ({
            definition: await enrich(resource),
            name: resource.metadata.name,
        }))
    );
    return enrichedDefinitions.reduce((acc, { name, definition }) => ({ ...acc, [name]: definition }), {});
};
