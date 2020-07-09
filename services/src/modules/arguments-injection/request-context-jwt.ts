import { decode as decodeJwt } from 'jsonwebtoken';
import fastify, { FastifyRequest } from 'fastify';

type jwtData = {
  [name: string]: unknown;
};

declare module '../context' {
  interface RequestContext {
    request: Pick<fastify.FastifyRequest, 'headers'>;
    jwt?: jwtData;
  }
}
const authzHeaderPrefix = 'Bearer ';

interface JwtProxy {
  _jwt?: jwtData;
  request: Pick<fastify.FastifyRequest, 'headers'>;
}

function getJwtClaim(target: JwtProxy, property: string): unknown {
  if (target._jwt) return target._jwt[property];

  const authzHeader = target.request.headers?.authorization as string | undefined;

  const jwtStr = authzHeader?.startsWith(authzHeaderPrefix) && authzHeader.substr(authzHeaderPrefix.length);
  target._jwt = jwtStr ? (decodeJwt(jwtStr, { json: true }) as jwtData) : {};
  return target._jwt[property];
}

export default function getJwt(request: Pick<FastifyRequest, 'headers'>): Record<string, unknown> {
  const target = { request };
  const handler = { get: getJwtClaim };
  const proxy = new Proxy(target, handler);
  return proxy;
}
