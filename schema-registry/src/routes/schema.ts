import * as express from "express";
import * as bodyParser from "body-parser";
import sources, { defaultSource } from "../sources-config";
import sync$ from "../sync/sync-service";
import { take } from "rxjs/operators";

const app = express();

const getFromSource = async (source: string, res: express.Response) => {
  try {
    const schemas = await sources[source].getSchemas();
    res.send(schemas);
  } catch (error) {
    console.warn(`Failed to get schema from source - ${source}`, {
      error
    });
    res.sendStatus(500);
  }
};

const postSource = async (
  source: string,
  req: express.Request,
  res: express.Response
) => {
  try {
    await sources[source].registerSchema(req.params.name, req.body);
    res.sendStatus(200);
  } catch (error) {
    console.warn(`Failed to register schema to source - ${source}`, {
      name: req.params.name,
      error
    });
    res.sendStatus(500);
  }
};

app
  .use(bodyParser.text())
  .get("/:sourceName", (req, res) => getFromSource(req.params.sourceName, res))
  .post("/:sourceName/:name", (req, res) =>
    postSource(req.params.sourceName, req, res)
  )
  .get("/", async (_, res) => res.send(await sync$.pipe(take(1)).toPromise()))
  .post("/:name", (req, res) => postSource(defaultSource, req, res));

export default app;
