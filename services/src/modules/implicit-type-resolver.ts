import { visit, DocumentNode, GraphQLError } from 'graphql';
import { IResolvers } from '@graphql-tools/utils';

type SourceWithTypename = {
  __typename: string;
};

function createTypeResolver(name: string) {
  return {
    __resolveType(obj: SourceWithTypename) {
      if (!obj.__typename) {
        throw new GraphQLError(
          `Expecting a "__typename" property in source when resolving an interface or union: ${name}.`
        );
      }
      return obj.__typename;
    },
  };
}

export default function createTypeResolvers(schema: DocumentNode) {
  const resolvers: IResolvers<SourceWithTypename> = {};
  visit(schema, {
    InterfaceTypeDefinition(node) {
      resolvers[node.name.value] = createTypeResolver(node.name.value);
    },
    UnionTypeDefinition(node) {
      resolvers[node.name.value] = createTypeResolver(node.name.value);
    },
  });
  return resolvers;
}
