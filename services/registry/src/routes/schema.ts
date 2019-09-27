import * as bodyParser from 'body-parser';
import * as express from 'express';
import { take } from 'rxjs/operators';
import logger from '../logger';
import sources, { defaultSource } from '../sources-config';
import { AgogosObjectConfig } from '../sync/object-types';
import syncSchema$ from '../sync/sync-service';

const app = express();

const getFromSource = async (source: string, res: express.Response) => {
  try {
    const gqlObjects = await sources[source].getAgogosObjects();
    res.send(gqlObjects);
  } catch (error) {
    logger.warn({ error }, `Failed to get from source - ${source}`);
    res.sendStatus(500);
  }
};

const postSource = async (
  source: string,
  kind: string,
  name: string,
  definition: AgogosObjectConfig,
  res: express.Response
) => {
  try {
    await sources[source].putAgogosObject(name, kind, definition);
    res.sendStatus(200);
  } catch (error) {
    logger.warn({
      name,
      kind,
      error
    }, `Failed to register schema to source - ${source}`);
    res.sendStatus(500);
  }
};

app
  .use(bodyParser.text())
  .get('/:sourceName', (req, res) => getFromSource(req.params.sourceName, res))
  .post('/:sourceName/:kind/:name', (req, res) => {
    const { sourceName, kind, name } = req.params;
    const definition = req.body;
    return postSource(sourceName, kind, name, definition, res);
  })
  .get('/', async (_, res) => res.send(await syncSchema$.pipe(take(1)).toPromise()))
  .post(':kind/:name', (req, res) => {
    const { kind, name } = req.params;
    const definition = req.body;
    return postSource(defaultSource, kind, name, definition, res);
  });

export default app;
