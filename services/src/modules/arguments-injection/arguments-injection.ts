import { GraphQLResolveInfo } from 'graphql';
import { RequestContext } from '../context';
import { getExportsProxy } from '../exports';
import evaluate from './arguments-evaluation';

export function inject<T = unknown>(
  template: string,
  source: unknown | undefined,
  args: Record<string, unknown> | undefined,
  context: Pick<RequestContext, 'jwt' | 'exports'> | undefined,
  info?: GraphQLResolveInfo
): T {
  const data = {
    source,
    args,
    jwt: context?.jwt,
    exports: info && context && getExportsProxy(context.exports, info?.parentType, source as Record<string, unknown>),
    vars: info?.variableValues,
  };

  return evaluate<T>(template, data);
}

export function deepInject(
  obj: { [key: string]: unknown },
  parent: unknown,
  args: Record<string, unknown>,
  context: RequestContext,
  info: GraphQLResolveInfo
) {
  const newObj = { ...obj };

  for (const key in obj) {
    const value = obj[key];

    if (typeof value === 'string') {
      newObj[key] = inject(value, parent, args, context, info);
    } else if (isObject(value)) {
      newObj[key] = deepInject(value, parent, args, context, info);
    }
  }

  return newObj;
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}
