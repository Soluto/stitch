import * as path from 'path';
import * as envVar from 'env-var';
import { LoggerOptions, LevelWithSilent } from 'pino';
// import { PlaygroundConfig } from 'apollo-server-core';
import { AuthenticationConfig } from './authentication/types';
import { CorsConfiguration } from './cors';

const envVarExt = envVar.from(process.env, {
  asSet: (value: string) => new Set(value.split(',')),
});

// General
export const nodeEnv = envVarExt.get('NODE_ENV').default('development').asString();

export const httpPort = envVarExt.get('PORT').default('8080').asIntPositive();
export const keepAliveTimeout = envVarExt.get('KEEP_ALIVE_TIMEOUT').asIntPositive();

// Logging
export type ChildLoggersLevels = Record<string, LevelWithSilent>;
export const logLevel = envVarExt.get('LOG_LEVEL').default('WARN').asString();
export const childLoggerLevels = envVarExt.get('CHILD_LOGGERS_LEVELS').default({}).asJsonObject() as ChildLoggersLevels;
export const loggerConfiguration = envVar.get('LOGGER_CONFIGURATION').default({}).asJsonObject() as LoggerOptions;

// Repositories
export const useS3ResourceRepository = envVarExt.get('USE_S3_RESOURCE_REPOSITORY').default('false').asBoolStrict();
export const useFileSystemResourceRepository = envVarExt
  .get('USE_FS_RESOURCE_REPOSITORY')
  .default('true')
  .asBoolStrict();

// Resources
export const resourceUpdateInterval = envVarExt.get('RESOURCE_UPDATE_INTERVAL').default('60000').asIntPositive();

// GraphQL configuration
export const enableGraphQLTracing = envVarExt.get('GRAPHQL_TRACING').default('true').asBool();
// export const enableGraphQLPlayground = envVarExt
//   .get('GRAPHQL_PLAYGROUND')
//   .default('true')
//   .asJsonObject() as PlaygroundConfig;
export const enableGraphQLIntrospection = envVarExt.get('GRAPHQL_INTROSPECTION').default('true').asBoolStrict();

// Policies
export const tmpPoliciesDir = envVarExt
  .get('TMP_POLICIES_DIR')
  .default(path.resolve(process.cwd(), 'tmp/policies'))
  .asString();

export const ignorePolicies =
  envVar.get('NODE_ENV').required().asString() !== 'production' &&
  envVar.get('IGNORE_POLICIES').default('false').asBoolStrict();

// Authentication
const defaultAuthenticationConfig: AuthenticationConfig = {
  anonymous: {
    publicPaths: ['/metrics', '/.well-known/apollo/server-health', '/graphql', '/status'],
  },
};
export const authenticationConfig =
  (envVarExt.get('AUTHENTICATION_CONFIGURATION').asJsonObject() as AuthenticationConfig) ?? defaultAuthenticationConfig;

// Plugins
export const pluginsDir = envVar.get('PLUGINS_DIR').asString();
export const pluginsConfig = envVar.get('PLUGINS_CONFIGURATION').asJsonObject() as Record<string, unknown> | undefined;

// TODO:Check the list of apollo federation directives when upgrading apollo version
const defaultKnownApolloDirectives = 'key,extends,external,requires,provides';
export const knownApolloDirectives = envVarExt
  .get('KNOWN_APOLLO_DIRECTIVES')
  .default(defaultKnownApolloDirectives)
  .asSet();

export const corsConfiguration = envVar.get('CORS_CONFIGURATION').default({}).asJsonObject() as CorsConfiguration;

export const requestDurationPromHistogramBuckets: number[] = envVarExt
  .get('REQUEST_DURATION_PROM_HISTOGRAM_BUCKETS')
  .default('[0.02, 0.1, 0.5, 2, 10]')
  .asJsonArray();

export const resolverDurationPromHistogramBuckets: number[] = envVarExt
  .get('RESOLVER_DURATION_PROM_HISTOGRAM_BUCKETS')
  .default('[0.02, 0.1, 0.5, 2, 10]')
  .asJsonArray();
