import {GraphQLObjectType, GraphQLResolveInfo, GraphQLField, GraphQLInterfaceType} from 'graphql';
import {GraphQLExtension} from 'apollo-server-core';
import {RequestContext} from '../context';

function isObject(val: any): val is object {
    return Object(val) === val;
}

const parentMap = new WeakMap<any, {parent: any; parentType: GraphQLObjectType | GraphQLInterfaceType}>();
export class ExportTrackingExtension implements GraphQLExtension<RequestContext> {
    willResolveField(
        source: any,
        _args: any,
        _context: RequestContext,
        info: GraphQLResolveInfo
    ): ((error: Error | null, result?: any) => void) | void {
        return (error, result) => {
            if (error || result === null || typeof result === 'undefined') {
                return;
            }

            // If the result is not an object or array, there's never a need to look it up because it won't have children
            // Therefore, we don't need to set it up in the parentMap
            // The fact that WeakMap doesn't support non-object keys is a happy coincidence
            if (Array.isArray(result)) {
                for (let i = 0; i < result.length; i++) {
                    parentMap.set(result[i], {parent: source, parentType: info.parentType});
                }
            } else if (isObject(result)) {
                parentMap.set(result, {parent: source, parentType: info.parentType});
            }
        };
    }
}

const exportMap = new WeakMap<GraphQLObjectType | GraphQLInterfaceType, Map<string, string>>();
export function markExport(
    object: GraphQLObjectType | GraphQLInterfaceType,
    field: GraphQLField<any, any>,
    exportKey: string
) {
    let exportToFieldMap = exportMap.get(object);
    if (typeof exportToFieldMap === 'undefined') {
        exportToFieldMap = new Map<string, string>();
        exportMap.set(object, exportToFieldMap);
    }

    exportToFieldMap.set(exportKey, field.name);
}

export function resolveExport(
    objectType: GraphQLObjectType | GraphQLInterfaceType,
    objectValue: any,
    exportKey: string
): any {
    const parentExportToFieldMap = exportMap.get(objectType);

    if (typeof parentExportToFieldMap !== 'undefined') {
        const exportingFieldName = parentExportToFieldMap.get(exportKey);

        if (typeof exportingFieldName !== 'undefined') {
            return objectValue[exportingFieldName];
        }
    }

    const parentDetails = parentMap.get(objectValue);

    if (typeof parentDetails === 'undefined') {
        return null;
    }

    return resolveExport(parentDetails.parentType, parentDetails.parent, exportKey);
}
