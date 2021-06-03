import * as http from 'http';
import { FastifyError } from 'fastify';
import logger, { createChildLogger } from '../logger';

const mLogger = createChildLogger(logger, 'http-server');

export default function (req: http.IncomingMessage, res: http.ServerResponse, next: (err?: FastifyError) => void) {
  const contentType = req.headers['content-type'];
  if (contentType === 'multipart/form-data') {
    const message = `Unsupported content format: ${contentType}`;
    mLogger.debug({ contentType }, message);
    res.statusCode = 400;
    res.write(message);
    res.end();
    return;
  }
  next();
}
