import { concatAST, DocumentNode } from 'graphql';
import { IResolvers, SchemaDirectiveVisitor } from 'graphql-tools';
import { policyBaseSdl, sdl as directivesSdl, directiveMap } from '../directives';
import { transformBaseSchema as applyPlugins } from '../plugins';
import { sdl as scalarsSdl, resolvers as scalarResolvers } from './scalars';

export type BaseSchema = {
  typeDefs: DocumentNode;
  resolvers: IResolvers;
  directives: Record<string, typeof SchemaDirectiveVisitor>;
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
