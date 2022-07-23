import {
  ApolloServerPlugin,
  GraphQLRequestContextWillSendResponse,
  GraphQLFieldResolverParams,
} from 'apollo-server-plugin-base';
import * as promClient from 'prom-client';
import {
  knownApolloDirectives,
  requestDurationPromHistogramBuckets,
  resolverDurationPromHistogramBuckets,
} from '../config';

let requestDurationHistogram: promClient.Histogram<string> | undefined;
let resolverDurationHistogram: promClient.Histogram<string> | undefined;
let requestParsingErrorCounter: promClient.Counter<string> | undefined;
let requestValidationErrorCounter: promClient.Counter<string> | undefined;

export function initializeMetrics(pClient: typeof promClient) {
  requestDurationHistogram = new pClient.Histogram({
    name: 'graphql_request_duration_seconds',
    help: 'request duration in seconds',
    labelNames: ['status', 'operationName'],
    buckets: requestDurationPromHistogramBuckets,
  });

  resolverDurationHistogram = new pClient.Histogram({
    name: 'graphql_resolver_duration_seconds',
    help: 'resolver duration in seconds',
    labelNames: ['parentType', 'fieldName', 'status'],
    buckets: resolverDurationPromHistogramBuckets,
  });

  requestParsingErrorCounter = new pClient.Counter({
    name: 'graphql_request_parsing_errors_count',
    help: 'request query parsing errors',
  });

  requestValidationErrorCounter = new pClient.Counter({
    name: 'graphql_request_validation_errors_count',
    help: 'request query validation errors',
  });
}

export function createMetricsPlugin(): ApolloServerPlugin {
  return {
    async requestDidStart() {
      const endResponseTimer = requestDurationHistogram?.startTimer();
      return {
        async parsingDidStart() {
          return async (err?: Error) => {
            if (err) {
              requestParsingErrorCounter?.inc(1);
            }
          };
        },
        async validationDidStart() {
          return async (err?: ReadonlyArray<Error>) => {
            if (err && err?.length > 0) {
              requestValidationErrorCounter?.inc(1);
            }
          };
        },
        async willSendResponse(willSendResponseContext: GraphQLRequestContextWillSendResponse<unknown>) {
          const {
            operationName,
            response: { errors },
          } = willSendResponseContext;
          endResponseTimer?.({ operationName: operationName ?? 'N/A', status: errors ? 'error' : 'success' });
        },
        executionDidStart: async () => ({
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
