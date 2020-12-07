import * as path from 'path';
import * as envVar from 'env-var';
import { AuthenticationConfig } from './authentication/types';

const envVarExt = envVar.from(process.env, {
  asSet: (value: string) => new Set(value.split(',')),
});

// General
export const httpPort = envVarExt.get('PORT').default('8080').asIntPositive();
export const logLevel = envVarExt.get('LOG_LEVEL').default('WARN').asString();
export const nodeEnv = envVarExt.get('NODE_ENV').default('development').asString();

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
export const enableGraphQLPlayground = envVarExt.get('GRAPHQL_PLAYGROUND').default('true').asBoolStrict();
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
    publicPaths: ['/metrics', '/.well-known/apollo/server-health', '/graphql'],
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
