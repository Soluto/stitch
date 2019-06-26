import k8s = require("@kubernetes/client-node");
import Source from "./source-type";
import config from "./config";
import enrich from "./enrichment";
import { AgogosObjectConfig } from "./object-types";

export default (client: k8s.CustomObjectsApi): Source =>
    ({
        async getAgogosObjects(): Promise<{ [kind: string]: { [name: string]: AgogosObjectConfig } }> {
            const crds = await Promise.all(config.customResourceDefinitions.map(async kind => ({
                kind,
                definition: await getGqlObjectsByKind(kind, client),
            })));
            return crds.reduce((acc, o) => ({ ...acc, [o.kind]: o.definition }), {});
        },

        async putAgogosObject(name: string, kind: string, definition: AgogosObjectConfig): Promise<void> {
            throw "Not implemented";
        }
    });


const getGqlObjectsByKind = async (kind: string, client: k8s.CustomObjectsApi): Promise<{ [name: string]: string }> => {
    const response = await client.listClusterCustomObject(
        config.apiGroup,
        config.apiVersion,
        kind,
    );
    const definitions = response.body.items.map(item => ({
        name: item.metadata.name,
        definition: item.spec,
    }));
    const enrichedDefinitions: { name: string, definition: AgogosObjectConfig }[] = await Promise.all(definitions.map(async ({ name, definition }) => ({ name, definition: await enrich(kind, definition) })));
    return enrichedDefinitions.reduce((acc, { name, definition }) => ({ ...acc, [name]: definition }), {})
}