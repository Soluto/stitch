import * as express from "express";
import * as bodyParser from "body-parser";
import { take } from "rxjs/operators";
import { schemas$ } from "../sync/sync-service";
import { makeGqlDocumentFromGqlSources } from "../graphql/create-schema";

const app = express();

const validateSchema = async (
    source: string,
    name: string,
    definition: string
) => {
    const schemas = await schemas$.pipe(take(1)).toPromise();
    schemas[`${source}.${name}`] = definition;
    makeGqlDocumentFromGqlSources(schemas);
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
        // TODO: Use more general approach
        switch (kind) {
            case "gqlschemas":
                validateSchema(source, name, definition);
                break;
            default:
                throw new Error("Unknown GraphQL object kind");
        }
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
