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
        request: { query, operationName, variables },
      } = requestDidStartContext;
      const startHrTime = process.hrtime.bigint();
      const reqLogger = logger.child({ query, operationName });
      reqLogger.debug('Started to handle request');
      variables && reqLogger.trace({ variables }, 'request query variables');
      return {
        willSendResponse(willSendResponseContext: GraphQLRequestContextWillSendResponse<unknown>) {
          const {
            response: { errors, data },
          } = willSendResponseContext;

          const endHrTime = process.hrtime.bigint();
          const durationMs = Number(endHrTime - startHrTime) / 1000000;
          const logData = { errors, durationMs };
          if (errors) {
            reqLogger.warn(logData, 'The server encountered errors while proceeding request');
            return;
          }
          reqLogger.debug(logData, 'Finished to handle request');
          data && reqLogger.trace({ data }, 'response data');
        },
      };
    },
  };
}
