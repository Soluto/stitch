import { gql } from 'apollo-server-core';
import { EnumValueNode, GraphQLEnumType, GraphQLEnumValue, ValueNode } from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { GraphQLJSONObject } from 'graphql-scalars';

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

export class EnumValueDirective extends SchemaDirectiveVisitor {
  visitEnumValue(value: GraphQLEnumValue) {
    return value;
  }
}

export class EnumResolverDirective extends SchemaDirectiveVisitor {
  visitEnum(type: GraphQLEnumType): GraphQLEnumType | void | null {
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
  }
}

export const sdl = gql`
  directive @enumValue(value: JSON!) on ENUM_VALUE
  directive @enumResolver on ENUM
`;
