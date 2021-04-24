import { GraphQLError } from 'graphql';

interface SerializedError {
  name: string;
  message: string;
  errorCode?: string;
  innerErrors?: string[];
  path?: ReadonlyArray<string | number> | undefined;
}

export default {
  test(arg: any): boolean {
    return arg && Object.prototype.hasOwnProperty.call(arg, 'errors') && arg.errors && arg.errors.length > 0;
  },
  print(val: any): string {
    const errors = (val.errors as GraphQLError[]).map(e => {
      const error: SerializedError = {
        name: e.name,
        message: e.message,
        errorCode: e.extensions?.code,
        path: e.path,
      };
      if (e.extensions?.errors) {
        error.innerErrors = e.extensions?.errors?.map((err: Error) => err.message);
      }
      return error;
    });

    const data = val.data ?? {};

    return JSON.stringify({ errors, data }, undefined, 2);
  },
};
