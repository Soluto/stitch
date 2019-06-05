import * as express from "express";
import * as bodyParser from "body-parser";
import sources, { defaultSource } from "../sources-config";
import syncSchema$ from "../sync/sync-service";
import { take } from "rxjs/operators";

const app = express();

const getFromSource = async (source: string, res: express.Response) => {
    try {
        const gqlObjects = await sources[source].getGqlObjects();
        res.send(gqlObjects);
    } catch (error) {
        console.warn(`Failed to get from source - ${source}`, {
            error
        });
        res.sendStatus(500);
    }
};

const postSource = async (
    source: string,
    kind: string,
    name: string,
    definition: string,
    res: express.Response
) => {
    try {
        await sources[source].putGqlObject(name, kind, definition);
        res.sendStatus(200);
    } catch (error) {
        console.warn(`Failed to register schema to source - ${source}`, {
            name,
            kind,
            error
        });
        res.sendStatus(500);
    }
};

app
    .use(bodyParser.text())
    .get("/:sourceName", (req, res) => getFromSource(req.params.sourceName, res))
    .post("/:sourceName/:kind/:name", (req, res) => {
        const { sourceName, kind, name } = req.params;
        const definition = req.body;
        return postSource(sourceName, kind, name, definition, res);
    })
    .get("/", async (_, res) => res.send(await syncSchema$.pipe(take(1)).toPromise()))
    .post(":kind/:name", (req, res) => {
        const { kind, name } = req.params;
        const definition = req.body;
        return postSource(defaultSource, kind, name, definition, res);
    });

export default app;
