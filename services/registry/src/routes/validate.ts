import * as express from "express";
import * as bodyParser from "body-parser";

import validateSchema from "../validators/schemaValidator";

const app = express();

type ValidatorFunc = (source: string, name: string, definition: string) => Promise<void>

type ValidatorDictionary = {
    [kind: string]: ValidatorFunc;
}

const validators: ValidatorDictionary = {
    "gqlschemas": validateSchema,
};

// TODO: Move each validation to separate file
const validateSource = async (
    source: string,
    kind: string,
    name: string,
    definition: string,
    res: express.Response
) => {
    try {
        console.log(`got validation request - ${source}`, {
            name,
            kind,
        });

        if (!validators.hasOwnProperty(kind)) {
            throw new Error("Unknown GraphQL object kind");
        }
        validators[kind].call(source, name, definition);
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
