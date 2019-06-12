import * as express from "express";
import * as k8s from "@kubernetes/client-node";
import crd = require("./crd.json");
import createKubeSource from "./remote-source";
import "array-flat-polyfill";
import admission from "./admission";

const PORT = process.env.PORT || 3000; // Replace this

const createKubeClient = (): k8s.CustomObjectsApi => {
    const kc = new k8s.KubeConfig();
    kc.loadFromCluster();
    return kc.makeApiClient(k8s.CustomObjectsApi);
}

const kubeClient = createKubeClient();

const kubeSource = createKubeSource(kubeClient);

const app = express();

app.use("/health", async (_: express.Request, res: express.Response) =>
    res.send(true)
);

app.get("/", async (_: express.Request, res: express.Response) => {
    try {
        const gqlObjects = await kubeSource.getGqlObjects();
        res.send(gqlObjects);
        return;
    } catch (error) {
        console.warn(`Failed to get objects from source kubernetes`, {
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
