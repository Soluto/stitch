import * as express from "express";
import * as bodyParser from "body-parser";

import { validateNewObject } from "../validation";

const app = express();

// TODO: Move each validation to separate file
const validateSource = async (
    source: string,
    kind: string,
    name: string,
    definition: string,
    res: express.Response
): Promise<void> => {
    try {
        console.log(`got validation request - ${source}`, {
            name,
            kind,
        });

        await validateNewObject(name, kind, source, definition);

        res.sendStatus(200);
    } catch (error) {
        console.warn(`Failed to validate source - ${source}`, {
            name,
            kind,
            error,
        });
        res.sendStatus(400);
    }
};

app
    .use(bodyParser.text())
    .post("/:sourceName/:kind/:name", (req, res) => {
        const { sourceName, kind, name } = req.params;
        const definition = req.body;
        return validateSource(sourceName, kind, name, definition, res);
    });

export default app;
