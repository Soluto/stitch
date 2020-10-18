import * as path from 'path';
import * as envVar from 'env-var';
import { AuthenticationConfig } from './authentication/types';

// General
export const httpPort = envVar.get('PORT').default('8080').asIntPositive();
export const logLevel = envVar.get('LOG_LEVEL').default('WARN').asString();
export const nodeEnv = envVar.get('NODE_ENV').default('development').asString();

// Repositories
export const useS3ResourceRepository = envVar.get('USE_S3_RESOURCE_REPOSITORY').default('false').asBoolStrict();
export const useFileSystemResourceRepository = envVar.get('USE_FS_RESOURCE_REPOSITORY').default('true').asBoolStrict();

// Resources
export const resourceUpdateInterval = envVar.get('RESOURCE_UPDATE_INTERVAL').default('60000').asIntPositive();

// GraphQL configuration
export const enableGraphQLTracing = envVar.get('GRAPHQL_TRACING').default('true').asBool();
export const enableGraphQLPlayground = envVar.get('GRAPHQL_PLAYGROUND').default('true').asBoolStrict();
export const enableGraphQLIntrospection = envVar.get('GRAPHQL_INTROSPECTION').default('true').asBoolStrict();

// Policies
export const tmpPoliciesDir = envVar
  .get('TMP_POLICIES_DIR')
  .default(path.resolve(process.cwd(), 'tmp/policies'))
  .asString();

// Authentication
const defaultAuthenticationConfig: AuthenticationConfig = {
  anonymous: {
    paths: ['/metrics', '/.well-known/apollo/server-health', '/graphql'],
  },
};
export const authenticationConfig =
  (envVar.get('AUTHENTICATION_CONFIGURATION').asJsonObject() as AuthenticationConfig) ?? defaultAuthenticationConfig;

export const pluginsDir = envVar.get('PLUGINS_DIR').asString();

// TODO:Check the list of apollo federation directives when upgrading apollo version
const defaultKnownApolloDirectives = ['key', 'extends', 'external', 'requires', 'provides'];
export const knownApolloDirectives = envVar
  .get('KNOWN_APOLLO_DIRECTIVES')
  .default(defaultKnownApolloDirectives)
  .asArray();
