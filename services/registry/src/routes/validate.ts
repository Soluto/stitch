import * as bodyParser from "body-parser";
import * as express from "express";

import logger from "../logger";
import { AgogosObjectConfig } from "../sync/object-types";
import { validateNewObject } from "../validation";

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
        logger.info(`got validation request - ${source}`, {
            name,
            kind,
        });

        await validateNewObject(name, kind, source, spec);

        res.sendStatus(200);
    } catch (error) {
        logger.warn(`Failed to validate source - ${source}`, {
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
