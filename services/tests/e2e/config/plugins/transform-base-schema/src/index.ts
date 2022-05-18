import {
  concatAST,
  defaultFieldResolver,
  DocumentNode,
  FloatValueNode,
  GraphQLError,
  GraphQLScalarType,
  GraphQLSchema,
  Kind,
  ObjectValueNode,
  parse,
  ValueNode,
} from 'graphql';
import { getDirective, IResolvers, MapperKind, mapSchema } from '@graphql-tools/utils';

type BaseSchema = {
  typeDefs: DocumentNode;
  resolvers: IResolvers;
  directives: Record<string, (schema: GraphQLSchema) => GraphQLSchema>;
};

const directiveName = 'reverse';

export const directiveSchemaTransformer = (schema: GraphQLSchema) =>
  mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      const directive = getDirective(schema, fieldConfig, directiveName)?.[0];
      if (directive) {
        const originalResolve = fieldConfig.resolve || defaultFieldResolver;
        fieldConfig.resolve = async (parent, args, context, info) => {
          const result = await originalResolve.call(fieldConfig, parent, args, context, info);

          return String(result).split('').reverse().join('');
        };
        return fieldConfig;
      }
      return;
    },
  });

const sdl = parse(`
  directive @reverse on FIELD_DEFINITION

  scalar Point
`);

const Point = new GraphQLScalarType({
  name: 'Point',
  description: 'Point scalar',
  serialize: JSON.stringify,
  parseValue: value => JSON.parse(value.toString()),
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
    resolvers: { ...baseSchema.resolvers, ...resolvers },
    directives: { ...baseSchema.directives, reverse: directiveSchemaTransformer },
  };
  return result;
}
