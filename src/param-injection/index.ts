import {readFromContext} from './context';

const paramRegex = /{(\w+\.\w+)}/g;

function resolveTemplate(template: string, parent: any, args: {[key: string]: any}, context: any) {
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

export function injectParameters(template: string, parent: any, args: {[key: string]: any}, context: any) {
    return template.replace(paramRegex, (_, match) => resolveTemplate(match, parent, args, context));
}
