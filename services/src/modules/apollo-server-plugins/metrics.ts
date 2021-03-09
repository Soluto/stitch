import {
  ApolloServerPlugin,
  GraphQLRequestContextWillSendResponse,
  GraphQLFieldResolverParams,
  GraphQLRequestListenerParsingDidEnd,
  GraphQLRequestListenerValidationDidEnd,
} from 'apollo-server-plugin-base';
import { FastifyInstance } from 'fastify';
import { Histogram, Counter } from 'prom-client';
import { knownApolloDirectives } from '../config';

let requestDurationHistogram: Histogram<string> | undefined;
let resolverDurationHistogram: Histogram<string> | undefined;
let requestParsingErrorCounter: Counter<string> | undefined;
let requestValidationErrorCounter: Counter<string> | undefined;

export function createMetricsPlugin(fastifyInstance: Pick<FastifyInstance, 'metrics'>): ApolloServerPlugin {
  return {
    serverWillStart() {
      const promClient = fastifyInstance.metrics?.client;
      requestDurationHistogram = new promClient.Histogram({
        name: 'graphql_request_duration_seconds',
        help: 'request duration in seconds',
        labelNames: ['status'],
      });

      resolverDurationHistogram = new promClient.Histogram({
        name: 'graphql_resolver_duration_seconds',
        help: 'resolver duration in seconds',
        labelNames: ['parentType', 'fieldName', 'status'],
      });

      requestParsingErrorCounter = new promClient.Counter({
        name: 'graphql_request_parsing_errors',
        help: 'request query parsing errors',
      });

      requestValidationErrorCounter = new promClient.Counter({
        name: 'graphql_request_validation_errors',
        help: 'request query validation errors',
      });
    },
    requestDidStart() {
      const endResponseTimer = requestDurationHistogram?.startTimer();
      return {
        parsingDidStart(): GraphQLRequestListenerParsingDidEnd {
          return (err?: Error) => {
            if (err) {
              requestParsingErrorCounter?.inc(1);
            }
          };
        },
        validationDidStart(): GraphQLRequestListenerValidationDidEnd {
          return (err?: ReadonlyArray<Error>) => {
            if (err && err?.length > 0) {
              requestValidationErrorCounter?.inc(1);
            }
          };
        },
        willSendResponse(willSendResponseContext: GraphQLRequestContextWillSendResponse<unknown>) {
          const {
            response: { errors },
          } = willSendResponseContext;
          endResponseTimer?.({ status: errors ? 'error' : 'success' });
        },
        executionDidStart: () => ({
          willResolveField(
            fieldResolverParams: GraphQLFieldResolverParams<unknown, unknown, Record<string, unknown>>
          ): ((error: Error | null, result?: unknown) => void) | void {
            const {
              source,
              info: { fieldName, parentType },
            } = fieldResolverParams;

            const parentObject = source as Record<string, unknown>;
            const intuitiveValue = parentObject?.[fieldName];

            const fieldDirectives = parentType.getFields()[fieldName].astNode?.directives;
            const hasCustomDirectives = fieldDirectives?.some(d => !knownApolloDirectives.has(d.name.value));

            if (intuitiveValue && !hasCustomDirectives) {
              // TODO: This is patch that should remove all fields which are resolved by default resolver.
              // Unfortunately, this patch will remove also fields with custom resolver that replaces source object property with name like a field
              return;
            }

            const endResolverTimer = resolverDurationHistogram?.startTimer({ parentType: parentType.name, fieldName });
            return (error: Error | null) => {
              endResolverTimer?.({ status: error ? 'error' : 'success' });
            };
          },
        }),
      };
    },
  };
}
