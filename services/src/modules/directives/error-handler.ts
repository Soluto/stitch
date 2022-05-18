import { mapSchema, MapperKind, getDirective } from '@graphql-tools/utils';
import { gql } from 'apollo-server-core';
import { GraphQLFieldResolverParams } from 'apollo-server-types';
import { defaultFieldResolver, FieldNode, GraphQLResolveInfo, GraphQLSchema } from 'graphql';
import { inject } from '../arguments-injection';
import { RequestContext } from '../context';

const defaultObjectResolver = (
  source: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _fields: Record<string, ReadonlyArray<FieldNode>>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: RequestContext,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _info: GraphQLResolveInfo
) => source;

const directiveName = 'errorHandler';

export const sdl = gql`
  input CatchErrorInput {
    condition: String
    returnValue: JSON
  }

  input ThrowErrorInput {
    condition: String
    errorToThrow: String
  }

  directive @errorHandler(catchError: CatchErrorInput, throwError: ThrowErrorInput) on OBJECT | FIELD_DEFINITION
`;

export const directiveSchemaTransformer = (schema: GraphQLSchema) =>
  mapSchema(schema, {
    [MapperKind.OBJECT_TYPE]: object => {
      const directive = getDirective(schema, object, directiveName)?.[0];
      if (directive) {
        const originalResolve = object.resolveObject || defaultObjectResolver;
        const { catchError, throwError } = directive as ErrorHandlerDirectiveArgs;

        object.resolveObject = async (source, fields, context, info) => {
          const injectionArgs = { source, args: {}, context, info };
          let result;
          try {
            result = await originalResolve.call(object, source, fields, context, info);
          } catch (error) {
            result = handleCatchErrorArgument(catchError, error as Error, injectionArgs);
          }
          throwError && handleThrowErrorArgument(throwError, result, injectionArgs);
          return result;
        };
        return object;
      }
      return;
    },
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
      if (directive) {
        const originalResolve = fieldConfig.resolve || defaultFieldResolver;
        const { catchError, throwError } = directive as ErrorHandlerDirectiveArgs;

        fieldConfig.resolve = async (source, args, context, info) => {
          const injectionArgs = { source, args, context, info };
          let result;
          try {
            result = await originalResolve.call(fieldConfig, source, args, context, info);
          } catch (error) {
            result = handleCatchErrorArgument(catchError, error as Error, injectionArgs);
          }

          throwError && handleThrowErrorArgument(throwError, result, injectionArgs);
          return result;
        };
        return fieldConfig;
      }
      return;
    },
  });

type ErrorHandlerDirectiveArgs = {
  catchError?: {
    condition?: string;
    returnValue: string | Record<string, unknown>;
  };
  throwError?: {
    condition?: string;
    errorToThrow: string;
  };
};

function handleCatchErrorArgument(
  catchError: { condition?: string | undefined; returnValue?: string | Record<string, unknown> } | undefined,
  error: Error,
  injectionArgs: GraphQLFieldResolverParams<unknown, RequestContext>
) {
  if (!catchError) throw error;

  let shouldCatch = true;
  if (catchError.condition) {
    const catchErrorConditionResult = inject(catchError.condition, { error, ...injectionArgs });
    // If injection throws it returns the template. In this case fail the condition
    shouldCatch = !!catchErrorConditionResult && catchErrorConditionResult != catchError.condition;
  }
  if (!shouldCatch) {
    throw error;
  }

  let result: unknown;
  if (!catchError.returnValue) {
    result = null;
  } else if (typeof catchError.returnValue === 'string') {
    result = inject(catchError.returnValue, { error, ...injectionArgs });
  } else {
    result = catchError.returnValue;
  }
  return result;
}

function handleThrowErrorArgument(
  throwError: { condition?: string; errorToThrow: string },
  result: unknown,
  injectionArgs: GraphQLFieldResolverParams<unknown, RequestContext>
) {
  let shouldThrow = true;
  if (throwError.condition) {
    const throwErrorConditionResult = inject(throwError.condition, { result, ...injectionArgs });
    // If injection throws it returns the template. In this case fail the condition
    shouldThrow = !!throwErrorConditionResult && throwErrorConditionResult != throwError.condition;
  }
  if (!shouldThrow) return;

  let err = throwError.errorToThrow ? inject(throwError.errorToThrow, { result, ...injectionArgs }) : '';
  if (typeof err === 'string') {
    err = new Error(err);
  }
  throw err;
}
