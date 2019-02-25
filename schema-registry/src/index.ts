import * as express from "express";
import gqlSchemaRoute from "./routes/schema";
import sync$ from "./sync-service";

const PORT = process.env.PORT || 4000;

const app = express();

app.use("/isAlive", async (_: express.Request, res: express.Response) =>
  res.send(true)
);
app.use("/schema", gqlSchemaRoute);

app.listen({ port: PORT }, () =>
  console.log(`🚀 Server ready at http://localhost:${PORT}`)
);

sync$.subscribe(mergedSchema =>
  console.log("Schema", JSON.stringify(mergedSchema, null, 2))
);
