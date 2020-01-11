import {readFromContext} from './context';
import {RequestContext} from '../context';

const paramRegex = /{(\w+\.\w+)}/g;

function resolveTemplate(template: string, parent: any, args: {[key: string]: any}, context: RequestContext) {
    const [sourceName, propName] = template.split('.');

    switch (sourceName.toLowerCase()) {
        case 'source':
            return parent && parent[propName];
        case 'args':
            return args && args[propName];
        case 'context':
            return readFromContext(context, propName);
        default:
            return null;
    }
}

export function injectParameters(template: string, parent: any, args: {[key: string]: any}, context: RequestContext) {
    return template.replace(paramRegex, (_, match) => resolveTemplate(match, parent, args, context));
}

export function resolveParameters(template: string, parent: any, args: {[key: string]: any}, context: RequestContext) {
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
