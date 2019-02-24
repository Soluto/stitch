import * as express from "express";

const PORT = process.env.PORT || 4000;

const app = express();

app.use("/isAlive", async (_: any, res: any) => res.send(true));

app.listen({ port: PORT }, () =>
  console.log(`🚀 Server ready at http://localhost:${PORT}`)
);
