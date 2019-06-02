import * as express from "express";
import {
    config as kubeConfig,
    Client1_10 as KubeClient
} from "kubernetes-client";
import crd = require("./crd.json");
import createKubeSource from "./remote-source";
import "array-flat-polyfill";
import admission from "./admission";

const PORT = process.env.PORT || 3000; // Replace this

function createKubeClient() {
    const config = kubeConfig.getInCluster();
    const client = new KubeClient({ config });
    client.addCustomResourceDefinition(crd);
    return client;
}

const kubeClient = createKubeClient();

const kubeSource = createKubeSource(kubeClient);

const app = express();

app.use("/health", async (_: express.Request, res: express.Response) =>
    res.send(true)
);

app.get("/:kind", async (req: express.Request, res: express.Response) => {
    try {
        const schemas = await kubeSource.getGqlObjects(req.params.kind);
        res.send(schemas);
        return;
    } catch (error) {
        console.warn(`Failed to get schema from source kubernetes`, {
            error
        });
        res.sendStatus(500);
        return;
    }
});

app.listen({ port: PORT }, () =>
    console.log(`K8S gql controller ready at http://localhost:${PORT}`)
);

admission.start();
