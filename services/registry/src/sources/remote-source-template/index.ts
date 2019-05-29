import * as express from "express";
import * as bodyParser from "body-parser";

const PORT = 0; // Replace this
const REMOTE_SOURCE_NAME = "REMOTE SOURCE NAME"; // Replace this

import remoteSource from "./remote-source";

const app = express();

app.use("/health", async (_: express.Request, res: express.Response) =>
  res.send(true)
);

app.get("/", async (_: express.Request, res: express.Response) => {
  try {
    const schemas = await remoteSource.getSchemas();
    res.send(schemas);
    return;
  } catch (error) {
    console.warn(`Failed to get schema from source - ${REMOTE_SOURCE_NAME}`, {
      error
    });
    res.sendStatus(500);
    return;
  }
});

app
  .use(bodyParser.text())
  .post("/:name", async (req: express.Request, res: express.Response) => {
    try {
      await remoteSource.registerSchema(req.params.name, req.body);
      res.sendStatus(200);
      return;
    } catch (error) {
      console.warn(
        `Failed to register schema to source - ${REMOTE_SOURCE_NAME}`,
        {
          name: req.params.name,
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
