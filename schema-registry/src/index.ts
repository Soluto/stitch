import nconf = require("nconf");
nconf.env("__");

import * as express from "express";
import gqlSchemaRoute from "./routes/schema";
import { startGrpcServer } from "./sync/sync-grpc-server";

const PORT = process.env.PORT || 4000;

const app = express();

app.use("/health", async (_: express.Request, res: express.Response) =>
  res.send(true)
);
app.use("/schema", gqlSchemaRoute);
app.use("/validate", function() {});

app.listen({ port: PORT }, () =>
  console.log(`🚀 HTTP Server ready at http://localhost:${PORT}`)
);

startGrpcServer();
