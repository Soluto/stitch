import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils';
import { defaultFieldResolver, FieldNode, GraphQLResolveInfo, GraphQLSchema } from 'graphql';
import { gql } from 'apollo-server-core';
import * as lodash from 'lodash';
import { GraphQLFieldResolverParams } from 'apollo-server-types';
import { isObject } from '../utils';
import { inject } from '../arguments-injection';
import { RequestContext } from '../context';

const defaultObjectResolver = (
  source: any,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _fields: Record<string, ReadonlyArray<FieldNode>>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: RequestContext,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _info: GraphQLResolveInfo
) => source;

const directiveName = 'localResolver';

export const sdl = gql`
  enum LocalResolverMergeStrategy {
    Replace
    Merge
    MergeDeep
  }

  directive @localResolver(
    value: JSON = null
    mergeStrategy: LocalResolverMergeStrategy = Replace
    enabledIf: String = "{ true }"
  ) on OBJECT | FIELD_DEFINITION
`;

export const directiveSchemaTransformer = (schema: GraphQLSchema) =>
  mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: object => {
      const directive = getDirective(schema, object, directiveName)?.[0];
      if (directive) {
        const originalResolve = object.resolveObject || defaultObjectResolver;
        const { value, mergeStrategy, enabledIf } = directive;
        object.resolveObject = (source, fields, context, info) => {
          const isEnabled = isLocalResolverEnabled(enabledIf, { source, args: {}, context, info });
          let result: unknown;
          if (!isEnabled || mergeStrategy !== MergeStrategy.Replace) {
            result = originalResolve.call(object, source, fields, context, info);
          }
          if (!isEnabled) return result;

          return calculateReturnValue(result, value, mergeStrategy, { source, args: {}, context, info });
        };
        return object;
      }
      return;
    },
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
      if (directive) {
        const originalResolve = fieldConfig.resolve || defaultFieldResolver;
        const { value, mergeStrategy, enabledIf } = directive;
        fieldConfig.resolve = (source, args, context, info) => {
          const isEnabled = isLocalResolverEnabled(enabledIf, { source, args: {}, context, info });
          let result: unknown;
          if (!isEnabled || mergeStrategy !== MergeStrategy.Replace) {
            result = originalResolve.call(fieldConfig, source, args, context, info);
          }
          if (!isEnabled) return result;

          return calculateReturnValue(result, value, mergeStrategy, { source, args, context, info });
        };
        return fieldConfig;
      }
      return;
    },
  });

enum MergeStrategy {
  Replace = 'Replace',
  Merge = 'Merge',
  MergeDeep = 'MergeDeep',
}

const invalidValueArgumentTypeErrorMessage =
  'For @localResolver with Merge or MergeDeep strategies, the value parameter must evaluate to an object type';

function isLocalResolverEnabled(
  enabledIf: string | undefined,
  injectionArgs: GraphQLFieldResolverParams<unknown, RequestContext>
) {
  const enabledIfResult = inject(enabledIf, injectionArgs);
  // If injection throws it returns the template. In this case fail the condition
  return enabledIfResult && enabledIfResult !== enabledIf;
}

function calculateReturnValue(
  originalValue: unknown | Record<string, unknown> | undefined,
  value: string | Record<string, unknown>,
  mergeStrategy: MergeStrategy,
  injectionArgs: GraphQLFieldResolverParams<unknown, RequestContext>
) {
  const stubValue = inject(value, injectionArgs);
  if (mergeStrategy === MergeStrategy.Replace) return stubValue;

  if (!isObject(stubValue)) throw new Error(invalidValueArgumentTypeErrorMessage);
  if (!isObject(originalValue)) return stubValue;

  return mergeStrategy === MergeStrategy.MergeDeep
    ? lodash.merge(originalValue, stubValue)
    : { ...originalValue, ...stubValue };
}
