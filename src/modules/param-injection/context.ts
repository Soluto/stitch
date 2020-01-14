export interface ExportsContext {
    exports?: {[key: string]: any};
}

export function writeToContext(context: ExportsContext, key: string, value: any) {
    if (!context.exports) {
        context.exports = {};
    }

    context.exports[key] = value;
}

export function readFromContext(context: ExportsContext, key: string): any {
    if (!context.exports) {
        return undefined;
    }

    return context.exports[key];
}

declare module '../context' {
    interface RequestContext extends ExportsContext {}
}
