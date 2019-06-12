import k8s = require("@kubernetes/client-node");
import Source from "./source-type";
import config from "./config";

export default (client: k8s.CustomObjectsApi): Source =>
    ({
        async getGqlObjects(): Promise<{ [kind: string]: { [name: string]: string } }> {
            const crds = await Promise.all(config.customResourceDefinitions.map(async kind => ({
                kind,
                definition: await getGqlObjectsByKind(kind, client),
            })));
            return crds.reduce((acc, o) => ({ ...acc, [o.kind]: o.definition }), {});
        },

        async putGqlObject(name: string, gqlSchema: string): Promise<void> {
            throw "Not implemented";
        }
    });


const getGqlObjectsByKind = async (kind: string, client: k8s.CustomObjectsApi): Promise<{ [name: string]: string }> => {
    const response = await client.listNamespacedCustomObject(
        config.apiGroup,
        config.apiVersion,
        config.namespace,
        kind,
    );
    return response.body.items.map(item => ({
        name: item.metadata.name,
        definition: item.spec,
    })).reduce((acc, { name, definition }) => ({ ...acc, [name]: definition }), {})
}