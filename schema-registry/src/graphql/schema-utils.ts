import {
  DocumentNode,
  DefinitionNode,
  FieldDefinitionNode,
  InputValueDefinitionNode
} from "graphql";
import {
  pipe,
  indexBy,
  clone,
  map,
  equals,
  unionWith,
  uniq,
  flatten,
  values,
  groupBy
} from "ramda";

function validateSameFieldDefs(
  fieldDefA: FieldDefinitionNode | InputValueDefinitionNode,
  fieldDefB: FieldDefinitionNode | InputValueDefinitionNode
) {
  const { directives: _, ...fieldDefWithNoDirectivesA } = fieldDefA;
  const { directives: __, ...fieldDefWithNoDirectivesB } = fieldDefB;
  if (!equals(fieldDefWithNoDirectivesA, fieldDefWithNoDirectivesB)) {
    throw `Same field definition should be identical except for directives - field ${
      fieldDefA.name.value
    }`;
  }
}

function mergeSameFieldDefinitions(
  fieldDefinitions: ReadonlyArray<
    FieldDefinitionNode | InputValueDefinitionNode
  >
): ReadonlyArray<FieldDefinitionNode | InputValueDefinitionNode> {
  if (fieldDefinitions.length === 0) return [];
  if (fieldDefinitions.length === 1) return fieldDefinitions;

  const [fieldDefA, fieldDefB, ...rest] = fieldDefinitions;
  validateSameFieldDefs(fieldDefA, fieldDefB);

  const { directives: _, ...otherFields } = fieldDefA;
  const fieldWithMergedDirectives = {
    ...otherFields,
    directives: uniq([
      ...(fieldDefA.directives || []),
      ...(fieldDefB.directives || [])
    ])
  };

  return mergeSameFieldDefinitions([fieldWithMergedDirectives, ...rest]);
}

const mergeFields = (
  l: ReadonlyArray<FieldDefinitionNode | InputValueDefinitionNode>,
  r: ReadonlyArray<FieldDefinitionNode | InputValueDefinitionNode>
) =>
  pipe(
    groupBy(
      (fieldDef: FieldDefinitionNode | InputValueDefinitionNode) =>
        fieldDef.name.value
    ),
    values,
    map(mergeSameFieldDefinitions),
    flatten
  )([...l, ...r]);

export function mergeDocuments(schemas: Array<DocumentNode>) {
  return clone(schemas).reduce((acc: DocumentNode, next: DocumentNode) => {
    const index = indexBy((x: DefinitionNode) => {
      if (
        x.kind === "ObjectTypeDefinition" ||
        x.kind === "UnionTypeDefinition" ||
        x.kind === "InputObjectTypeDefinition"
      ) {
        return `${x.kind}_${x.name.value}`;
      }
      return "";
    })(acc.definitions);

    const get = (kind: string, value: string) => index[`${kind}_${value}`];

    next.definitions.forEach(x => {
      if (
        (x.kind !== "ObjectTypeDefinition" &&
          x.kind !== "UnionTypeDefinition" &&
          x.kind !== "InputObjectTypeDefinition") ||
        !get(x.kind, x.name.value)
      ) {
        (<any>acc.definitions).push(x);
        return;
      }

      let ref = get(x.kind, x.name.value);
      if (
        x.kind === "ObjectTypeDefinition" ||
        x.kind === "InputObjectTypeDefinition"
      ) {
        (<any>ref).directives = uniq([
          ...(<any>ref).directives,
          ...(x.directives || [])
        ]);
        (<any>ref).fields = mergeFields((<any>ref).fields, x.fields || []);

        if (x.kind === "ObjectTypeDefinition") {
          (<any>ref).interfaces = uniq([
            ...(<any>ref).interfaces,
            ...(x.interfaces || [])
          ]);
        }
        return;
      }

      if (x.kind === "UnionTypeDefinition") {
        (<any>ref).types = unionWith(equals, (<any>ref).types, x.types || []);
        return;
      }
    });

    return acc;
  });
}
