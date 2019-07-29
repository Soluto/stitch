import * as express from "express";
import * as bodyParser from "body-parser";

import { validateNewObject } from "../validation";
import { AgogosObjectConfig } from "../sync/object-types";

const app = express();

// TODO: Move each validation to separate file
const validateSource = async (
    source: string,
    kind: string,
    name: string,
    spec: AgogosObjectConfig,
    res: express.Response
): Promise<void> => {
    try {
        console.log(`got validation request - ${source}`, {
            name,
            kind,
        });

        await validateNewObject(name, kind, source, spec);

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
    .use(bodyParser.json())
    .post("/:sourceName/:kind/:name", (req: express.Request, res: express.Response) => {
        const { sourceName, kind, name } = req.params;
        const spec: AgogosObjectConfig = req.body;
        return validateSource(sourceName, kind, name, spec, res);
    });

export default app;
