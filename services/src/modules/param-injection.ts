import { GraphQLResolveInfo } from 'graphql';
import { decode as decodeJwt } from 'jsonwebtoken';
import * as R from 'ramda';
import { RequestContext } from './context';

interface GraphQLArguments {
  [key: string]: unknown;
}
type jwtData = {
  [name: string]: unknown;
};

const paramRegex = /{(source|args|jwt|exports)\.(\w+(\.\w+)*)}/g;
const authzHeaderPrefix = 'Bearer ';

function resolveTemplate(
  source: string,
  key: string,
  parent: unknown,
  args: GraphQLArguments,
  context: RequestContext,
  info: GraphQLResolveInfo
) {
  const propPath = key.split('.');
  switch (source) {
    case 'source':
      return parent && R.path(propPath, parent);
    case 'args':
      return args && R.path(propPath, args);
    case 'exports':
      return context.exports.resolve(info.parentType, parent as Record<string, unknown>, key);
    case 'jwt':
      return getJwt(context)[key];
    default:
      return null;
  }
}

export function injectParameters(
  template: string,
  parent: unknown,
  args: GraphQLArguments,
  context: RequestContext,
  info: GraphQLResolveInfo
) {
  let didFindValues = false;
  let didFindTemplates = false;
  const value = template.replace(paramRegex, (_, source, key) => {
    const resolved = resolveTemplate(source, key, parent, args, context, info);
    didFindTemplates = true;
    didFindValues = didFindValues || (resolved !== null && typeof resolved !== 'undefined');
    return String(resolved);
  });
  return { value, didFindValues, didFindTemplates };
}

export function resolveParameters(
  template: string,
  parent: unknown,
  args: GraphQLArguments,
  context: RequestContext,
  info: GraphQLResolveInfo
) {
  let foundMatches = false;
  const matches = Array.from(template.matchAll(paramRegex));

  const parameters: { [key: string]: unknown } = {};
  for (const match of matches) {
    foundMatches = true;
    const paramTemplate = match[0];
    const source = match[1];
    const key = match[2];
    if (paramTemplate in parameters) {
      continue;
    }
    parameters[paramTemplate] = resolveTemplate(source, key, parent, args, context, info);
  }
  return foundMatches ? parameters : null;
}

export function deepInjectParameters(
  obj: { [key: string]: unknown },
  parent: unknown,
  args: GraphQLArguments,
  context: RequestContext,
  info: GraphQLResolveInfo
) {
  const newObj = { ...obj };

  for (const key in obj) {
    const value = obj[key];

    if (typeof value === 'string') {
      newObj[key] = injectParameters(value, parent, args, context, info).value;
    } else if (isObject(value)) {
      newObj[key] = deepInjectParameters(value, parent, args, context, info);
    }
  }

  return newObj;
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

function getJwt(context: RequestContext): jwtData {
  if (context.jwt) return context.jwt;

  const authzHeader = context?.request?.headers?.authorization as string | undefined;

  const jwtStr = authzHeader?.startsWith(authzHeaderPrefix) && authzHeader.substr(authzHeaderPrefix.length);
  context.jwt = jwtStr ? (decodeJwt(jwtStr, { json: true }) as jwtData) : {};
  return context.jwt;
}

declare module './context' {
  interface RequestContext {
    jwt?: jwtData;
  }
}
