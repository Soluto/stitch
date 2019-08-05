import * as k8s from "@kubernetes/client-node";
import "array-flat-polyfill";
import * as express from "express";
import admission from "./admission";
import logger, { loggingMiddleware } from "./logger";
import createKubeSource from "./remote-source";

const PORT = process.env.PORT || 3000; // Replace this

const createKubeClient = (): k8s.CustomObjectsApi => {
    const kc = new k8s.KubeConfig();
    kc.loadFromCluster();
    return kc.makeApiClient(k8s.CustomObjectsApi);
}

const kubeClient = createKubeClient();

const kubeSource = createKubeSource(kubeClient);

const app = express();

app.use(loggingMiddleware);

app.get("/health", async (_: express.Request, res: express.Response) =>
    res.send(true),
);

app.get("/metrics", (_: express.Request, res: express.Response) =>
    res.send(true),
);

app.get("/", async (_: express.Request, res: express.Response) => {
    try {
        const gqlObjects = await kubeSource.getAgogosObjects();
        res.send(gqlObjects);
        return;
    } catch (error) {
        logger.warn({ error }, `Failed to get objects from source kubernetes`);
        res.sendStatus(500);
        return;
    }
});

app.listen({ port: PORT }, () =>
    logger.info(`K8S gql controller ready at http://localhost:${PORT}`)
);

admission.start();
