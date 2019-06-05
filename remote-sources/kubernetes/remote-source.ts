import * as KubernetesClient from "kubernetes-client";
import Source from "./source-type";
import config from "./config";

export default (client: KubernetesClient.ApiRoot): Source =>
    ({
        async getGqlObjects(): Promise<{ [kind: string]: { [name: string]: string } }> {
            const namespace = client.apis[config.apiVersion].v1.namespaces(config.namespace);
            const crdResults = await Promise.all(config.customResourceDefinitions.map(async kind => ({ kind, definition: await namespace[kind].get() })));
            const crds = crdResults.map(r => ({ kind: r.kind, items: r.definition.body.items }));
            return crds.map(getObjectDefinitionFromCrd).reduce((acc, o) => ({ ...acc, [o.kind]: o.definition }), {});
        },

        async putGqlObject(name: string, gqlSchema: string): Promise<void> {
            throw "Not implemented";
        }
    });

const getObjectSpecFromItem = item => ({ name: `${item.metadata.namespace}.${item.metadata.name}`, spec: item.spec });
const getObjectSpecsDictionaryFromItems = items => items.map(getObjectSpecFromItem).reduce((acc, obj) => ({ ...acc, [obj.name]: obj.spec }), {});
const getObjectDefinitionFromCrd = crdResult => ({ kind: crdResult.kind, definition: getObjectSpecsDictionaryFromItems(crdResult.items) });