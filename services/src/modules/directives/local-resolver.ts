import { SchemaDirectiveVisitor } from 'graphql-tools';
import { GraphQLField, defaultFieldResolver } from 'graphql';
import { gql } from 'apollo-server-core';
import * as lodash from 'lodash';
import { isObject } from '../utils';
import { inject } from '../arguments-injection';
import { RequestContext } from '../context';

export class LocalResolverDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<unknown, RequestContext>) {
    const { value, mergeStrategy, enabledIf } = this.args as LocalResolverArgs;
    const originalResolve = field.resolve || defaultFieldResolver;

    field.resolve = async (source, args, context, info) => {
      const enabledIfResult = inject(enabledIf, { source, args, context, info });
      // If injection throws it returns the template. In this case fail the condition
      const isEnabled = enabledIfResult && enabledIfResult !== enabledIf;
      if (!isEnabled) return await originalResolve.call(field, source, args, context, info);

      const stubValue = inject(value, { source, args, context, info });
      if (mergeStrategy === MergeStrategy.Replace) return stubValue;

      if (!isObject(stubValue)) throw new Error(invalidStubTypeErrorMessage);

      const originalValue = await originalResolve.call(field, source, args, context, info);

      return mergeStrategy === MergeStrategy.MergeDeep
        ? lodash.merge(originalValue, stubValue)
        : { ...originalValue, ...stubValue };
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
  ) on FIELD_DEFINITION
`;

enum MergeStrategy {
  Replace = 'Replace',
  Merge = 'Merge',
  MergeDeep = 'MergeDeep',
}
type LocalResolverValue = string | Record<string, unknown>;
type LocalResolverArgs = { value: LocalResolverValue; mergeStrategy: MergeStrategy; enabledIf?: string };

const invalidStubTypeErrorMessage =
  'For @localResolver with Merge or MergeDeep strategies, the value parameter must evaluate to an object type';
