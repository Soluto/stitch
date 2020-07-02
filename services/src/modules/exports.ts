import { GraphQLObjectType, GraphQLResolveInfo, GraphQLField, GraphQLInterfaceType } from 'graphql';
import { GraphQLExtension } from 'apollo-server-core';
import { RequestContext } from './context';

function isObject(val: unknown): val is Record<string, unknown> {
  return new Object(val) === val;
}

export class ExportTrackingExtension implements GraphQLExtension<RequestContext> {
  objectToParentMap = new Map<unknown, { parent: unknown; parentType: GraphQLObjectType | GraphQLInterfaceType }>();

  requestDidStart(options: { context: RequestContext }) {
    options.context.exports = this;
  }

  willResolveField(
    source: unknown,
    _args: unknown,
    _context: RequestContext,
    info: GraphQLResolveInfo
  ): ((error: Error | null, result?: unknown) => void) | void {
    return (error, result) => {
      if (error || result === null || typeof result === 'undefined') {
        return;
      }

      // If the result is not an object or array, there's never a need to look it up because it won't have children
      // Therefore, we don't need to set it up in the parentMap
      // This means parentMap can also be a weakMap if we want it to be
      if (Array.isArray(result)) {
        for (const element of result) {
          if (isObject(element)) {
            this.objectToParentMap.set(element, { parent: source, parentType: info.parentType });
          }
        }
      } else if (isObject(result)) {
        this.objectToParentMap.set(result, { parent: source, parentType: info.parentType });
      }
    };
  }

  resolve(
    objectType: GraphQLObjectType | GraphQLInterfaceType,
    objectValue: Record<string, unknown>,
    exportKey: string
  ): unknown {
    const parentExportToFieldMap = exportMap.get(objectType);

    if (typeof parentExportToFieldMap !== 'undefined') {
      const exportingFieldName = parentExportToFieldMap.get(exportKey);

      if (typeof exportingFieldName !== 'undefined') {
        return objectValue[exportingFieldName];
      }
    }

    const parentDetails = this.objectToParentMap.get(objectValue);

    if (typeof parentDetails === 'undefined') {
      return;
    }

    return this.resolve(parentDetails.parentType, parentDetails.parent as Record<string, unknown>, exportKey);
  }
}

const exportMap = new WeakMap<GraphQLObjectType | GraphQLInterfaceType, Map<string, string>>();
export function markExport(
  object: GraphQLObjectType | GraphQLInterfaceType,
  field: GraphQLField<unknown, RequestContext>,
  exportKey: string
) {
  let exportToFieldMap = exportMap.get(object);
  if (typeof exportToFieldMap === 'undefined') {
    exportToFieldMap = new Map<string, string>();
    exportMap.set(object, exportToFieldMap);
  }

  exportToFieldMap.set(exportKey, field.name);
}

declare module './context' {
  interface RequestContext {
    exports: Pick<ExportTrackingExtension, 'resolve'>;
  }
}
