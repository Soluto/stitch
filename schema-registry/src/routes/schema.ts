import * as express from "express";
import * as bodyParser from "body-parser";
import sources from "../sources-config";

const app = express();

app.get("/:sourceName", async (req: express.Request, res: express.Response) => {
  try {
    const schemas = await sources[req.params.sourceName].getSchemas();
    res.send(schemas);
  } catch (error) {
    console.warn(
      `Failed to get schema from source - ${req.params.sourceName}`,
      {
        error
      }
    );
    res.sendStatus(500);
  }
});

app
  .use(bodyParser.text())
  .post(
    "/:sourceName/:name",
    async (req: express.Request, res: express.Response) => {
      try {
        await sources[req.params.sourceName].registerSchema(
          req.params.name,
          req.body
        );
        res.sendStatus(200);
      } catch (error) {
        console.warn(
          `Failed to register schema to source - ${req.params.sourceName}`,
          {
            name: req.params.name,
            error
          }
        );
        res.sendStatus(500);
      }
    }
  );

export default app;
