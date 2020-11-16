import { GraphQLResolveInfo } from 'graphql';
import { FastifyRequest } from 'fastify';
import { RequestContext } from '../context';
import { getExportsProxy } from '../exports';
import { isObject } from '../utils';
import evaluate from './arguments-evaluation';

declare module '../context' {
  interface RequestContext {
    request: Pick<FastifyRequest, 'headers' | 'decodeJWT' | 'isAnonymousAccess'>;
  }
}

function injectTemplate<T = unknown>(
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
    headers: context?.request?.headers,
    isAnonymousAccess: context?.request?.isAnonymousAccess?.(),
    exports: info && context && getExportsProxy(context.exports, info?.parentType, source as Record<string, unknown>),
    vars: info?.variableValues,
  };

  return evaluate<T>(template, data);
}

export function inject(
  input: unknown,
  parent: unknown | undefined,
  args: Record<string, unknown> | undefined,
  context: Pick<RequestContext, 'exports' | 'request'> | undefined,
  info?: GraphQLResolveInfo
): unknown {
  if (typeof input === 'string') return injectTemplate(input, parent, args, context, info);

  if (isObject(input)) {
    return Object.entries(input).reduce((obj, [key, value]) => {
      obj[key] = inject(value, parent, args, context, info);
      return obj;
    }, {} as Record<string, unknown>);
  }

  if (Array.isArray(input)) return input.map(value => inject(value, parent, args, context, info));

  return input;
}
