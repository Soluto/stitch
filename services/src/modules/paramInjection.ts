import {GraphQLResolveInfo} from 'graphql';
import {decode as decodeJwt} from 'jsonwebtoken';
import {RequestContext} from './context';

interface GraphQLArguments {
    [key: string]: any;
}
type jwtData = {
    [name: string]: any;
};

const paramRegex = /{(\w+\.\w+)}/g;
const authzHeaderPrefix = 'Bearer ';

function resolveTemplate(
    template: string,
    parent: any,
    args: GraphQLArguments,
    context: RequestContext,
    info: GraphQLResolveInfo
) {
    const [sourceName, propName] = template.split('.');

    switch (sourceName.toLowerCase()) {
        case 'source':
            return parent && parent[propName];
        case 'args':
            return args && args[propName];
        case 'exports':
            return context.exports.resolve(info.parentType, parent, propName);
        case 'jwt':
            return getJwt(context)[propName];
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
    const value = template.replace(paramRegex, (_, match) => {
        const resolved = resolveTemplate(match, parent, args, context, info);
        didFindTemplates = true;
        didFindValues = didFindValues || (resolved !== null && typeof resolved !== 'undefined');
        return resolved;
    });

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

        parameters[group] = resolveTemplate(group, parent, args, context, info);
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
