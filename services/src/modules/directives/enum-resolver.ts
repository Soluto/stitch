import { gql } from 'apollo-server-core';
import { EnumValueNode, GraphQLSchema, ValueNode } from 'graphql';
import { GraphQLJSONObject } from 'graphql-scalars';
import { mapSchema, MapperKind, getDirective } from '@graphql-tools/utils';

function parseValueNode(valueNode: ValueNode) {
  switch (valueNode.kind) {
    case 'BooleanValue':
    case 'IntValue':
    case 'FloatValue':
    case 'StringValue':
    case 'EnumValue':
      return valueNode.value;

    case 'ObjectValue':
      return GraphQLJSONObject.parseLiteral(valueNode, {});

    default:
      throw new Error(`Unexpected value node type ${valueNode.kind}`);
  }
}

const directiveName = 'enumResolver';

export const sdl = gql`
  directive @enumResolver on ENUM
`;

export const directiveSchemaTransformer = (schema: GraphQLSchema) =>
  mapSchema(schema, {
    [MapperKind.ENUM_TYPE]: type => {
      const directive = getDirective(schema, type, directiveName)?.[0];
      if (directive) {
        const values = type.getValues().map(enumVal => {
          const key = enumVal.name;
          const enumValueDirective = enumVal.astNode?.directives?.find(d => d.name.value === 'enumValue');
          if (!enumValueDirective) {
            throw new Error('Each ENUM_VALUE must have @enumValue directive');
          }
          const valNode = enumValueDirective.arguments?.find(a => a.name.value === 'value')?.value;
          if (!valNode) {
            throw new Error('@enumValue directive must have "value" argument');
          }
          const value = parseValueNode(valNode);
          return { key, value };
        });

        type.parseValue = k => values.find(({ key }) => key === k)?.value;
        type.serialize = v => values.find(({ value }) => value === v)?.key;
        type.parseLiteral = keyNode => {
          const k = (keyNode as EnumValueNode).value;
          return values.find(({ key }) => key === k)?.value;
        };
        return type;
      }
      return;
    },
  });
