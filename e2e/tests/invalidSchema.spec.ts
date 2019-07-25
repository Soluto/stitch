import * as fs from "fs";
import k8s = require('@kubernetes/client-node');

type AgogosSchema = {
    apiVersion: string,
    metadata: {
        name: string,
        namespace: string,
    },
    kind: string,
    spec: object,
};

describe("Invalid schema", () => {
    const k8sConfig = new k8s.KubeConfig();
    let client: k8s.CustomObjectsApi;

    before(() => {
        k8sConfig.loadFromCluster();
        client = k8sConfig.makeApiClient(k8s.CustomObjectsApi);
    });

    it("should reject invalid schema addition", async () => {
        const yaml = await fs.promises.readFile("./data/invalidSchema.gql.yaml", { encoding: "utf8" });
        const crd: AgogosSchema = k8s.loadYaml(yaml);

        const [group, version] = crd.apiVersion.split("/");
        const response = await client.createNamespacedCustomObject(group, version, crd.metadata.namespace, "schemas", crd);

        console.log(`======= \n`, response.body);
    });
});