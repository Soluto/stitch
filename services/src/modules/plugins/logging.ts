import {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestContextWillSendResponse,
} from 'apollo-server-plugin-base';
import logger from '../logger';

export function createLoggingPlugin(): ApolloServerPlugin {
  return {
    requestDidStart(requestDidStartContext: GraphQLRequestContext<unknown>) {
      const {
        request: { query, operationName },
      } = requestDidStartContext;
      const startHrTime = process.hrtime.bigint();
      logger.trace({ query, operationName }, 'Started to handle request');
      return {
        willSendResponse(willSendResponseContext: GraphQLRequestContextWillSendResponse<unknown>) {
          const {
            request: { query, operationName },
            response: { errors },
          } = willSendResponseContext;

          const endHrTime = process.hrtime.bigint();
          const durationMs = Number(endHrTime - startHrTime) / 1000000;
          const logData = { query, operationName, errors, durationMs };
          if (errors) {
            logger.warn(logData, 'The server encountered errors while proceeding request');
            return;
          }
          logger.trace(logData, 'Finished to handle request');
        },
      };
    },
  };
}
