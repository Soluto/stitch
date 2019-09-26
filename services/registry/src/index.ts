import logger, { loggingMiddleware } from './logger';

import * as express from 'express';
import gqlSchemaRoute from './routes/schema';
import validateRoute from './routes/validate';
import { startGrpcServer } from './sync/sync-grpc-server';
import nconf = require('nconf');
nconf.env('__');

const PORT = process.env.PORT || 4000;

const app = express();

app.use(loggingMiddleware);

app.get('/health', (_: express.Request, res: express.Response) =>
  res.send(true)
);
app.get('/metrics', (_: express.Request, res: express.Response) =>
  res.send(true)
);

app.use('/schema', gqlSchemaRoute);
app.use('/validate', validateRoute);

app.listen({ port: PORT }, () =>
  logger.info(`🚀 HTTP Server ready at http://localhost:${PORT}`)
);

startGrpcServer();
