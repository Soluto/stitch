import { SchemaDirectiveVisitor } from 'graphql-tools';
import { GraphQLField, defaultFieldResolver } from 'graphql';
import { gql } from 'apollo-server-core';
import * as lodash from 'lodash';
import { inject, deepInject } from '../arguments-injection';
import { RequestContext } from '../context';

export class LocalResolverDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<unknown, RequestContext>) {
    const { value, mergeStrategy } = this.args as LocalResolverArgs;
    const originalResolve = field.resolve || defaultFieldResolver;

    field.resolve = async (parent, args, context, info) => {
      const stubValue =
        typeof value === 'string'
          ? inject(value, parent, args, context, info)
          : deepInject(value, parent, args, context, info);

      if (mergeStrategy === MergeStrategy.Replace) return stubValue;

      const originalValue = await originalResolve.call(field, parent, args, context, info);

      return mergeStrategy === MergeStrategy.MergeDeep
        ? lodash.merge(originalValue, stubValue)
        : { ...originalValue, ...(stubValue as any) };
    };
  }
}

export const sdl = gql`
  enum LocalResolverMergeStrategy {
    Replace
    Merge
    MergeDeep
  }

  directive @localResolver(value: JSON!, mergeStrategy: LocalResolverMergeStrategy = Replace) on FIELD_DEFINITION
`;

enum MergeStrategy {
  Replace = 'Replace',
  Merge = 'Merge',
  MergeDeep = 'MergeDeep',
}
type LocalResolverValue = string | Record<string, unknown>;
type LocalResolverArgs = { value: LocalResolverValue; mergeStrategy: MergeStrategy };
