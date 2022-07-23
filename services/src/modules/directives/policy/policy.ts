import { GraphQLResolveInfo, defaultFieldResolver, FieldNode, GraphQLSchema } from 'graphql';
import { gql } from 'apollo-server-core';
import { mapSchema, MapperKind, getDirective } from '@graphql-tools/utils';
import { RequestContext } from '../../context';
import logger, { createChildLogger } from '../../logger';
import { GraphQLArguments, Policy } from './types';

const directiveName = 'policy';

export const sdl = gql`
  directive @policy(
    namespace: String!
    name: String!
    args: JSONObject
    postResolve: Boolean = false
  ) on OBJECT | FIELD_DEFINITION
`;

export const directiveSchemaTransformer = (schema: GraphQLSchema) =>
  mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: object => {
      const directive = getDirective(schema, object, directiveName)?.[0];
      if (directive) {
        const policy = directive as Policy;
        const originalResolveObject = object.resolveObject;

        object.resolveObject = async (
          source: unknown,
          fields: Record<string, ReadonlyArray<FieldNode>>,
          context: RequestContext,
          info: GraphQLResolveInfo
        ) => {
          const { namespace, name, postResolve } = policy;
          const pLogger = createChildLogger(logger, 'policy-directive', {
            policy: { namespace, name },
            type: info.parentType.name,
            field: info.fieldName,
          });
          if (!postResolve) {
            pLogger.trace('Pre resolve validation');
            await context.policyExecutor.validatePolicy(policy, source, {}, context, info);
          }

          const result = originalResolveObject ? await originalResolveObject(source, fields, context, info) : source;
          pLogger.trace(
            { policy: { namespace, name }, type: info.parentType.name, field: info.fieldName, result },
            'Field resolver executed'
          );

          if (postResolve) {
            pLogger.trace({ result }, 'Post resolve validation');
            await context.policyExecutor.validatePolicy(policy, source, {}, context, info, result);
          }

          return result;
        };
        return object;
      }
      return;
    },
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
      if (directive) {
        const policy = directive as Policy;
        const originalResolve = fieldConfig.resolve || defaultFieldResolver;

        fieldConfig.resolve = async (
          source: unknown,
          args: GraphQLArguments,
          context: RequestContext,
          info: GraphQLResolveInfo
        ) => {
          const { namespace, name, postResolve } = policy;
          const pLogger = createChildLogger(logger, 'policy-directive', {
            policy: { namespace, name },
            type: info.parentType.name,
            field: info.fieldName,
          });
          if (!postResolve) {
            pLogger.trace('Pre resolve validation');
            await context.policyExecutor.validatePolicy(policy, source, args, context, info);
          }

          const result = await originalResolve.call(fieldConfig, source, args, context, info);

          if (postResolve) {
            pLogger.trace({ result }, 'Post resolve validation');
            await context.policyExecutor.validatePolicy(policy, source, args, context, info, result);
          }

          return result;
        };
        return fieldConfig;
      }
      return;
    },
  });
