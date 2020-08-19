import { GraphQLResolveInfo } from 'graphql';
import { FastifyRequest } from 'fastify';
import { RequestContext } from '../context';
import { getExportsProxy } from '../exports';
import evaluate from './arguments-evaluation';

declare module '../context' {
  interface RequestContext {
    request: Pick<FastifyRequest, 'headers' | 'decodeJWT'>;
  }
}

export function inject<T = unknown>(
  template: string,
  source: unknown | undefined,
  args: Record<string, unknown> | undefined,
  context: Pick<RequestContext, 'exports' | 'request'> | undefined,
  info?: GraphQLResolveInfo
): T {
  const data = {
    source,
    args,
    jwt: context?.request?.decodeJWT?.()?.payload,
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
  if (!isObject(obj) || Array.isArray(obj)) return obj;
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
