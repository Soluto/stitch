import { GraphQLSchema } from 'graphql';
import { gql } from 'apollo-server-core';
import { mapSchema, MapperKind, getDirective } from '@graphql-tools/utils';
import logger, { createChildLogger } from '../../logger';
import { Policy } from './types';

const directiveName = 'policyQuery';

export const sdl = gql`
  directive @policyQuery(namespace: String!, name: String!) on FIELD_DEFINITION
`;

export const directiveSchemaTransformer = (schema: GraphQLSchema) =>
  mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      // Check whether this field has the specified directive
      const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
      if (directive) {
        fieldConfig.resolve = async (source, args, context, info) => {
          const policy: Policy = {
            namespace: directive.namespace,
            name: directive.name,
            args,
          };

          const logData = {
            policy: {
              namespace: policy.namespace,
              name: policy.name,
            },
            type: info.parentType.name,
            field: info.fieldName,
          };
          const policyLogger = createChildLogger(logger, 'policy-query-directive', logData);
          policyLogger.trace('Evaluating policy...');
          const allow = await context.policyExecutor.evaluatePolicy(policy, policyLogger, source, args, context, info);
          policyLogger.trace({ allow }, 'The policy has been evaluated');
          return { allow };
        };
        return fieldConfig;
      }
      return;
    },
  });
