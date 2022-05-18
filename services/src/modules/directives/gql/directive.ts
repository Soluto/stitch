import { GraphQLSchema, print } from 'graphql';
import { ApolloError, gql } from 'apollo-server-core';
import { wrapSchema } from '@graphql-tools/wrap';
// import { FastifyRequest } from 'fastify';
import fetch from 'node-fetch';
import { delegateToSchema } from '@graphql-tools/delegate';
import { mapSchema, MapperKind, getDirective, AsyncExecutor } from '@graphql-tools/utils';
import { loadSchema } from '@graphql-tools/load';
import { inject } from '../../arguments-injection';
// import { applyUpstream } from '../../upstreams';
import { ResourceGroup } from '../../resource-repository';
import { RemoteSchema } from './introspection';

const directiveName = 'gql';

export const directiveSchemaTransformer = (
  schema: GraphQLSchema,
  directiveContext?: { resourceGroup: ResourceGroup }
) =>
  mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      if (!directiveContext) return;
      const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
      if (directive) {
        const { url, fieldName, arguments: gqlArgs, operationType: operationTypeParam /*, timeoutMs */ } = directive;
        const operationType = operationTypeParam?.toLowerCase() ?? 'query';

        const remoteSchemas: RemoteSchema[] | undefined = directiveContext.resourceGroup.remoteSchemas;
        const remoteSchemaResource = remoteSchemas?.find(rs => rs.url === url)?.schema;
        if (!remoteSchemaResource) {
          throw new ApolloError(`Remote schema for ${url} not found in resource group`);
        }

        // const link = ApolloLink.from([
        //   setContext(async (_, context) => {
        //     const requestParams = await applyUpstream(
        //       {
        //         url: new URL(url),
        //       },
        //       directiveContext.resourceGroup,
        //       context?.graphqlContext?.activeDirectoryAuth,
        //       context?.graphqlContext?.request as FastifyRequest
        //     );
        //     return { ...requestParams, uri: requestParams.url };
        //   }),
        //   createHttpLink({
        //     fetch: fetch as any,
        //     fetchOptions: { timeout: timeoutMs ?? 10000 },
        //   }),
        // ]);

        const executor: AsyncExecutor = async ({ document, variables }) => {
          const query = print(document);
          const fetchResult = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, variables }),
          });
          return fetchResult.json();
        };

        const createRemoteSchema = async () =>
          wrapSchema({
            schema: await loadSchema(remoteSchemaResource, { loaders: [] }),
            executor,
          });

        fieldConfig.resolve = async (source, args, context, info) => {
          const schema = await createRemoteSchema();
          return delegateToSchema({
            schema,
            operation: operationType,
            fieldName,
            args: inject(gqlArgs, { source, args, context, info }) as Record<string, unknown>,
            context,
            info,
          });
        };
        return fieldConfig;
      }
      return;
    },
  });

export const sdl = gql`
  enum GraphQLOperationType {
    Query
    Mutation
  }

  directive @gql(
    url: String!
    fieldName: String!
    operationType: GraphQLOperationType
    arguments: JSONObject
    timeoutMs: Int
  ) on FIELD_DEFINITION
`;
