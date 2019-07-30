import k8s = require('@kubernetes/client-node');
import Source from './source-type';
import config from './config';
import enrich from './enrichment';
import { AgogosObjectConfig, AgogosCustomResource } from './object-types';

export default (client: k8s.CustomObjectsApi): Source => ({
    async getAgogosObjects(): Promise<{ [kind: string]: { [name: string]: AgogosObjectConfig } }> {
        const crds = await Promise.all(
            config.customResourceDefinitions.map(async kind => ({
                kind,
                definition: await getAggObjectsByKind(kind, client),
            }))
        );
        return crds.reduce((acc, o) => ({ ...acc, [o.kind]: o.definition }), {});
    },

    async putAgogosObject(name: string, kind: string, definition: AgogosObjectConfig): Promise<void> {
        throw 'Not implemented';
    },
});

const getAggObjectsByKind = async (kind: string, client: k8s.CustomObjectsApi): Promise<{ [name: string]: string }> => {
    const response = await client.listClusterCustomObject(config.apiGroup, config.apiVersion, kind);
    const enrichedDefinitions: { name: string; definition: AgogosObjectConfig }[] = await Promise.all(
        response.body.items.map(async (resource: AgogosCustomResource<AgogosObjectConfig>) => ({
            name: resource.metadata.name,
            definition: await enrich(resource),
        }))
    );
    return enrichedDefinitions.reduce((acc, { name, definition }) => ({ ...acc, [name]: definition }), {});
};
