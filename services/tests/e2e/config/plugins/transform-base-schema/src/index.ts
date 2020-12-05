import {
  concatAST,
  defaultFieldResolver,
  DocumentNode,
  FloatValueNode,
  GraphQLError,
  GraphQLField,
  GraphQLScalarType,
  Kind,
  ObjectValueNode,
  parse,
  ValueNode,
} from 'graphql';
import { IResolvers, SchemaDirectiveVisitor } from 'graphql-tools';
import merge from 'lodash.merge';

type BaseSchema = {
  typeDefs: DocumentNode;
  resolvers: IResolvers;
  directives: Record<string, typeof SchemaDirectiveVisitor>;
};

class ReverseDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<unknown, unknown>) {
    const originalResolve = field.resolve || defaultFieldResolver;
    field.resolve = async (parent, args, context, info) => {
      const result = await originalResolve.call(field, parent, args, context, info);

      return String(result).split('').reverse().join('');
    };
  }
}

const sdl = parse(`
  directive @reverse on FIELD_DEFINITION

  scalar Point
`);

const Point = new GraphQLScalarType({
  name: 'Point',
  description: 'Point scalar',
  serialize: JSON.stringify,
  parseValue: JSON.parse,
  parseLiteral(ast: ValueNode) {
    if (ast.kind !== Kind.OBJECT) {
      throw new GraphQLError('Wrong format for PolicyDetails');
    }
    const obj = ast as ObjectValueNode;
    const x = obj.fields.find(f => f.name.value === 'x');
    const y = obj.fields.find(f => f.name.value === 'y');
    return {
      x: (x?.value as FloatValueNode).value,
      y: (y?.value as FloatValueNode).value,
    };
  },
});

const resolvers: IResolvers = {
  Point,
};

export function transformBaseSchema(baseSchema: BaseSchema): BaseSchema {
  const result = {
    typeDefs: concatAST([baseSchema.typeDefs, sdl]),
    resolvers: merge(baseSchema.resolvers, resolvers),
    directives: { ...baseSchema.directives, reverse: ReverseDirective },
  };
  return result;
}
