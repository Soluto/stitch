import { SchemaDirectiveVisitor } from 'graphql-tools';
import { GraphQLField, defaultFieldResolver, FieldNode, GraphQLObjectType, GraphQLResolveInfo } from 'graphql';
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

export class LocalResolverDirective extends SchemaDirectiveVisitor {
  visitObject(object: GraphQLObjectType<unknown, RequestContext>) {
    const originalResolve = object.resolveObject || defaultObjectResolver;
    const { value, mergeStrategy, enabledIf } = this.args as LocalResolverArgs;

    object.resolveObject = async (source, fields, context, info) => {
      const isEnabled = isLocalResolverEnabled(enabledIf, { source, args: {}, context, info });
      let result: unknown;
      if (!isEnabled || mergeStrategy !== MergeStrategy.Replace) {
        result = originalResolve.call(object, source, fields, context, info);
      }
      if (!isEnabled) return result;

      return calculateReturnValue(result, value, mergeStrategy, { source, args: {}, context, info });
    };
  }

  visitFieldDefinition(field: GraphQLField<unknown, RequestContext>) {
    const originalResolve = field.resolve || defaultFieldResolver;
    const { value, mergeStrategy, enabledIf } = this.args as LocalResolverArgs;

    field.resolve = async (source, args, context, info) => {
      const isEnabled = isLocalResolverEnabled(enabledIf, { source, args: {}, context, info });
      let result: unknown;
      if (!isEnabled || mergeStrategy !== MergeStrategy.Replace) {
        result = originalResolve.call(field, source, args, context, info);
      }
      if (!isEnabled) return result;

      return calculateReturnValue(result, value, mergeStrategy, { source, args, context, info });
    };
  }
}

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

enum MergeStrategy {
  Replace = 'Replace',
  Merge = 'Merge',
  MergeDeep = 'MergeDeep',
}
type LocalResolverArgs = { value: string | Record<string, unknown>; mergeStrategy: MergeStrategy; enabledIf?: string };

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
  if (!isObject(originalValue)) throw new Error(`Resolver result isn't an object`);

  return mergeStrategy === MergeStrategy.MergeDeep
    ? lodash.merge(originalValue, stubValue)
    : { ...originalValue, ...stubValue };
}
