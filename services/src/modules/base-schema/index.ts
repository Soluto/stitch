import { concatAST, DocumentNode } from 'graphql';
import { IResolvers, SchemaDirectiveVisitor } from 'graphql-tools';
import { policyBaseSdl, sdl as directivesSdl, directiveMap } from '../directives';
import { sdl as scalarsSdl, resolvers as scalarResolvers } from './scalars';

export type BaseSchema = {
  typeDefs: DocumentNode;
  resolvers: IResolvers;
  directives: Record<string, typeof SchemaDirectiveVisitor>;
};

export default async (): Promise<BaseSchema> => {
  return {
    typeDefs: concatAST([scalarsSdl, directivesSdl, policyBaseSdl]),
    resolvers: scalarResolvers,
    directives: directiveMap,
  };
};
