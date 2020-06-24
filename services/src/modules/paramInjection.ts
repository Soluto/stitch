import {GraphQLResolveInfo} from 'graphql';
import {decode as decodeJwt} from 'jsonwebtoken';
import {RequestContext} from './context';
import * as R from 'ramda';

interface GraphQLArguments {
    [key: string]: any;
}
type jwtData = {
    [name: string]: any;
};

const paramRegex = /{(source|args|exports)\.(\w+(\.\w+)*)}/g;
const authzHeaderPrefix = 'Bearer ';

function resolveTemplate(
    source: string,
    template: string,
    parent: any,
    args: GraphQLArguments,
    context: RequestContext,
    info: GraphQLResolveInfo
) {
    const propPath = template.split('.');
    switch (source) {
        case 'source':
            return parent && R.path(propPath, parent);
        case 'args':
            return args && R.path(propPath, args);
        case 'exports':
            return context.exports.resolve(info.parentType, parent, template);
        case 'jwt':
            return getJwt(context)[template];
        default:
            return null;
    }
}

export function injectParameters(
    template: string,
    parent: any,
    args: GraphQLArguments,
    context: RequestContext,
    info: GraphQLResolveInfo
) {
    let didFindValues = false;
    let didFindTemplates = false;
    let value: any = template;
    const match = paramRegex.exec(template);
    if (match) {
        value = resolveTemplate(match[1], match[2], parent, args, context, info);
        didFindTemplates = true;
        didFindValues = didFindValues || (value !== null && typeof value !== 'undefined');
    }
    return {value, didFindValues, didFindTemplates};
}

export function resolveParameters(
    template: string,
    parent: any,
    args: GraphQLArguments,
    context: RequestContext,
    info: GraphQLResolveInfo
) {
    let foundMatches = false;
    const matches = template.matchAll(paramRegex);

    const parameters: {[key: string]: any} = {};
    for (const match of matches) {
        foundMatches = true;

        const group = match[1];
        if (group in parameters) {
            continue;
        }

        parameters[group] = resolveTemplate(group, match[2], parent, args, context, info);
    }

    return foundMatches ? parameters : null;
}

export function deepInjectParameters(
    obj: {[key: string]: any},
    parent: any,
    args: GraphQLArguments,
    context: RequestContext,
    info: GraphQLResolveInfo
) {
    const newObj = {...obj};

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

function isObject(val: any): val is object {
    return typeof val === 'object' && val !== null;
}

function getJwt(context: RequestContext): jwtData {
    if (context.jwt) return context.jwt;

    const authzHeader = context?.request?.headers?.authorization;

    context.jwt = isAuthzHeaderValid(authzHeader)
        ? (decodeJwt(authzHeader.substr(authzHeaderPrefix.length), {json: true}) as jwtData)
        : {};

    return context.jwt;
}

function isAuthzHeaderValid(authzHeader: any): boolean {
    return authzHeader && authzHeader.startsWith(authzHeaderPrefix);
}

declare module './context' {
    interface RequestContext {
        jwt?: jwtData;
    }
}
