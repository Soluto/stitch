import { IResolvers } from '@graphql-tools/utils';
import { concatAST, DocumentNode, GraphQLSchema } from 'graphql';
import { policyBaseSdl, sdl as directivesSdl, directiveMap } from '../directives';
import { transformBaseSchema as applyPlugins } from '../plugins';
import { ResourceGroup } from '../resource-repository';
import { sdl as scalarsSdl, resolvers as scalarResolvers } from './scalars';

export type BaseSchema = {
  typeDefs: DocumentNode;
  resolvers: IResolvers;
  directives: Record<string, (schema: GraphQLSchema, context?: { resourceGroup: ResourceGroup }) => GraphQLSchema>;
};

export default async (): Promise<BaseSchema> => {
  const baseSchema = {
    typeDefs: concatAST([scalarsSdl, directivesSdl, policyBaseSdl]),
    resolvers: scalarResolvers,
    directives: directiveMap,
  };
  const baseSchemaWithPlugins = await applyPlugins(baseSchema);
  return baseSchemaWithPlugins;
};
