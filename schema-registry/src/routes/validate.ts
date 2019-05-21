import * as express from "express";
import * as bodyParser from "body-parser";
import { take } from "rxjs/operators";
import { schemas$ } from "../sync/sync-service";
import { makeGqlDocumentFromGqlSources } from "../graphql/create-schema";

const app = express();

const validateSource = async (
  source: string,
  req: express.Request,
  res: express.Response
) => {
  try {
    console.log(`got validation request - ${source}`);
    const schemas = await schemas$.pipe(take(1)).toPromise();
    schemas[`${source}.${req.params.name}`] = req.body;
    makeGqlDocumentFromGqlSources(schemas);
    res.sendStatus(200);
  } catch (error) {
    console.warn(`Failed to validate source - ${source}`, {
      name: req.params.name,
      error
    });
    res.sendStatus(400);
  }
};

app
  .use(bodyParser.text())
  .post("/:sourceName/:name", (req, res) =>
    validateSource(req.params.sourceName, req, res)
  );

export default app;
