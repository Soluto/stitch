import * as express from "express";
import * as bodyParser from "body-parser";

const PORT = 0; // Replace this
const REMOTE_SOURCE_NAME = "REMOTE SOURCE NAME"; // Replace this

import remoteSource from "./remote-source";

const app = express();

app.use("/health", async (_: express.Request, res: express.Response) =>
    res.send(true)
);

app.get("/:kind", async (req: express.Request, res: express.Response) => {
    const kind = req.params.kind;
    try {
        const gqlObjects = await remoteSource.getGqlObjects(kind);
        res.send(gqlObjects);
        return;
    } catch (error) {
        console.warn(`Failed to get ${kind} from source - ${REMOTE_SOURCE_NAME}`, {
            error
        });
        res.sendStatus(500);
        return;
    }
});

app
    .use(bodyParser.text())
    .post("/:kind/:name", async (req: express.Request, res: express.Response) => {
        const kind = req.params.kind;
        const name = req.params.name;
        const definition = req.body;
        try {
            await remoteSource.putGqlObject(name, kind, definition);
            res.sendStatus(200);
            return;
        } catch (error) {
            console.warn(
                `Failed to register schema to source - ${REMOTE_SOURCE_NAME}`,
                {
                    name,
                    kind,
                    error
                }
            );
            res.sendStatus(500);
            return;
        }
    });

app.listen({ port: PORT }, () =>
    console.log(
        `Remote source '${REMOTE_SOURCE_NAME}' ready at http://localhost:${PORT}`
    )
);
