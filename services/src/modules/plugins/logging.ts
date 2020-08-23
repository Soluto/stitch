import {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestContextWillSendResponse,
} from 'apollo-server-plugin-base';
import { FastifyInstance } from 'fastify';
import { Counter, Histogram } from 'prom-client';
import logger from '../logger';

let errorsInResponseCounter: Counter<string>;
let requestDurationHistogram: Histogram<string>;

export function createLoggingPlugin(fastifyInstance: FastifyInstance): ApolloServerPlugin {
  return {
    serverWillStart() {
      const promClient = fastifyInstance.metrics?.client;
      errorsInResponseCounter = new promClient.Counter({
        name: 'graphql_errors_in_response',
        help: 'Graphql Errors Counter',
      });
      requestDurationHistogram = new promClient.Histogram({
        name: 'graphql_request_duration_seconds',
        help: 'request duration in seconds',
      });
    },
    requestDidStart(requestDidStartContext: GraphQLRequestContext<unknown>) {
      const {
        request: { query, operationName },
      } = requestDidStartContext;
      const startHrTime = process.hrtime.bigint();
      logger.trace({ query, operationName }, 'Started to handle request');
      const endTimer = requestDurationHistogram.startTimer();
      return {
        willSendResponse(willSendResponseContext: GraphQLRequestContextWillSendResponse<unknown>) {
          const {
            request: { query, operationName },
            response: { errors },
          } = willSendResponseContext;

          const endHrTime = process.hrtime.bigint();
          const durationMs = Number(endHrTime - startHrTime) / 1000000;

          endTimer();
          const logData = { query, operationName, errors, durationMs };
          if (errors) {
            errorsInResponseCounter.inc();
            logger.warn(logData, 'The server encountered errors while proceeding request');
            return;
          }
          logger.trace(logData, 'Finished to handle request');
        },
      };
    },
  };
}
