import { GraphQLError } from 'graphql';

export default {
  test(arg: any): boolean {
    return arg && Object.prototype.hasOwnProperty.call(arg, 'errors') && arg.errors && arg.errors.length > 0;
  },
  print(val: any): string {
    const errors = val.errors as GraphQLError[];
    const formattedErrors = errors.map(e => ({
      name: e.name,
      message: e.message,
      exception: {
        code: e.extensions?.code,
      },
    }));

    return JSON.stringify(formattedErrors, undefined, 2);
  },
};
