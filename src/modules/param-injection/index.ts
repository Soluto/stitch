import {readFromContext} from './context';
import {RequestContext} from '../context';

interface GraphQLArguments {
    [key: string]: any;
}
const paramRegex = /{(\w+\.\w+)}/g;

function resolveTemplate(template: string, parent: any, args: GraphQLArguments, context: RequestContext) {
    const [sourceName, propName] = template.split('.');

    switch (sourceName.toLowerCase()) {
        case 'source':
            return parent && parent[propName];
        case 'args':
            return args && args[propName];
        case 'exports':
            return readFromContext(context, propName);
        default:
            return null;
    }
}

export function injectParameters(template: string, parent: any, args: GraphQLArguments, context: RequestContext) {
    return template.replace(paramRegex, (_, match) => resolveTemplate(match, parent, args, context));
}

export function resolveParameters(template: string, parent: any, args: GraphQLArguments, context: RequestContext) {
    let foundMatches = false;
    const matches = template.matchAll(paramRegex);

    const parameters: {[key: string]: any} = {};
    for (const match of matches) {
        foundMatches = true;

        const group = match[1];
        if (group in parameters) {
            continue;
        }

        parameters[group] = resolveTemplate(group, parent, args, context);
    }

    return foundMatches ? parameters : null;
}

export function injectParametersToObject(
    obj: {[key: string]: any},
    parent: any,
    args: GraphQLArguments,
    context: RequestContext
) {
    const newObj = {...obj};

    for (const key in obj) {
        const value = obj[key];

        if (typeof value === 'string') {
            newObj[key] = injectParameters(value, parent, args, context);
        } else if (isObject(value)) {
            newObj[key] = injectParametersToObject(value, parent, args, context);
        }
    }

    return newObj;
}

function isObject(val: any): val is object {
    return typeof val === 'object' && val !== null;
}
