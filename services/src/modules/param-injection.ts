import {GraphQLResolveInfo} from 'graphql';
import {RequestContext} from './context';
import {resolveExport} from './exports';

interface GraphQLArguments {
    [key: string]: any;
}
const paramRegex = /{(\w+\.\w+)}/g;

function resolveTemplate(
    template: string,
    parent: any,
    args: GraphQLArguments,
    _context: RequestContext,
    info: GraphQLResolveInfo
) {
    const [sourceName, propName] = template.split('.');

    switch (sourceName.toLowerCase()) {
        case 'source':
            return parent && parent[propName];
        case 'args':
            return args && args[propName];
        case 'exports':
            return resolveExport(info.parentType, parent, propName);
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
    return template.replace(paramRegex, (_, match) => resolveTemplate(match, parent, args, context, info));
}

export function injectParametersDetailed(
    template: string,
    parent: any,
    args: GraphQLArguments,
    context: RequestContext,
    info: GraphQLResolveInfo
) {
    let foundNonNull = false;
    let foundAny = false;
    const result = template.replace(paramRegex, (_, match) => {
        const resolved = resolveTemplate(match, parent, args, context, info);
        foundAny = true;
        foundNonNull = foundNonNull || (resolved !== null && typeof resolved !== 'undefined');
        return resolved;
    });

    return {result, foundNonNull, foundAny};
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

export function injectParametersToObject(
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
            newObj[key] = injectParameters(value, parent, args, context, info);
        } else if (isObject(value)) {
            newObj[key] = injectParametersToObject(value, parent, args, context, info);
        }
    }

    return newObj;
}

function isObject(val: any): val is object {
    return typeof val === 'object' && val !== null;
}
