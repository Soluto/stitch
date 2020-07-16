import { GraphQLError } from 'graphql';

export default {
  test(arg: any): boolean {
    return arg && Object.prototype.hasOwnProperty.call(arg, 'errors') && arg.errors && arg.errors.length > 0;
  },
  print(val: any): string {
    const errors = (val.errors as GraphQLError[]).map(e => ({
      name: e.name,
      message: e.message,
      exception: {
        code: e.extensions?.code,
      },
    }));
    const data = val.data ?? {};

    return JSON.stringify({ errors, data }, undefined, 2);
  },
};
