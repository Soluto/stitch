import { gql } from 'apollo-server-core';
import { GraphQLFieldResolverParams } from 'apollo-server-types';
import { defaultFieldResolver, FieldNode, GraphQLField, GraphQLObjectType, GraphQLResolveInfo } from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { injectArgs } from '../arguments-injection';
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

export class ErrorHandlerDirective extends SchemaDirectiveVisitor {
  visitObject(object: GraphQLObjectType<unknown, RequestContext>) {
    const originalResolve = object.resolveObject || defaultObjectResolver;
    const { catchError, throwError } = this.args as ErrorHandlerDirectiveArgs;

    object.resolveObject = async (source, fields, context, info) => {
      const injectionArgs = { source, args: {}, context, info };
      let result;
      try {
        result = await originalResolve.call(object, source, fields, context, info);
      } catch (error) {
        result = handleCatchErrorArgument(catchError, error, injectionArgs);
      }
      throwError && handleThrowErrorArgument(throwError, result, injectionArgs);
      return result;
    };
  }

  visitFieldDefinition(field: GraphQLField<unknown, RequestContext>) {
    const originalResolve = field.resolve || defaultFieldResolver;
    const { catchError, throwError } = this.args as ErrorHandlerDirectiveArgs;

    field.resolve = async (source, args, context, info) => {
      const injectionArgs = { source, args, context, info };
      let result;
      try {
        result = await originalResolve.call(field, source, args, context, info);
      } catch (error) {
        result = handleCatchErrorArgument(catchError, error, injectionArgs);
      }

      throwError && handleThrowErrorArgument(throwError, result, injectionArgs);
      return result;
    };
  }
}

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
    const catchErrorConditionResult = injectArgs(catchError.condition, { error, ...injectionArgs });
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
    result = injectArgs(catchError.returnValue, { error, ...injectionArgs });
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
    const throwErrorConditionResult = injectArgs(throwError.condition, { result, ...injectionArgs });
    // If injection throws it returns the template. In this case fail the condition
    shouldThrow = !!throwErrorConditionResult && throwErrorConditionResult != throwError.condition;
  }
  if (!shouldThrow) return;

  let err = throwError.errorToThrow ? injectArgs(throwError.errorToThrow, { result, ...injectionArgs }) : '';
  if (typeof err === 'string') {
    err = new Error(err);
  }
  throw err;
}
