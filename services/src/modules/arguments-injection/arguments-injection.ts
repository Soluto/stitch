import { FastifyRequest } from 'fastify';
import { GraphQLFieldResolverParams } from 'apollo-server-types';
import { RequestContext } from '../context';
// import { getExportsProxy } from '../exports';
import { isObject } from '../utils';
import { ResourceGroup } from '../resource-repository';
import evaluate from './arguments-evaluation';

declare module '../context' {
  interface RequestContext {
    request: Pick<FastifyRequest, 'headers' | 'decodeJWT' | 'isAnonymousAccess'>;
    resourceGroup: ResourceGroup;
  }
}

type InjectionParams = GraphQLFieldResolverParams<
  unknown,
  Pick<RequestContext, /*'exports' | */ 'request' | 'resourceGroup'> | undefined
> & { [key: string]: unknown };

function injectTemplate<T = unknown>(template: string, params: InjectionParams): T {
  const { source, args, context, info, ...additionalProps } = params;
  const data = {
    source,
    args,
    jwt: context?.request?.decodeJWT?.()?.payload,
    headers: context?.request?.headers,
    isAnonymousAccess: context?.request?.isAnonymousAccess?.(),
    // exports: info && context && getExportsProxy(context.exports, info?.parentType, source as Record<string, unknown>),
    vars: info?.variableValues,
    info,
    plugins: context?.resourceGroup?.pluginsData,
    ...additionalProps,
  };

  return evaluate<T>(template, data);
}

export function inject(input: unknown, params: InjectionParams): unknown {
  if (typeof input === 'string') return injectTemplate(input, params);

  if (isObject(input)) {
    return Object.entries(input).reduce((obj, [key, value]) => {
      obj[key] = inject(value, params);
      return obj;
    }, {} as Record<string, unknown>);
  }

  if (Array.isArray(input)) return input.map(value => inject(value, params));

  return input;
}
