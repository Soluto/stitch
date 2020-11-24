import { concatAST } from 'graphql';
import { GraphQLResolverMap } from 'apollo-graphql';
import { policyBaseSdl, sdl as directivesSdl } from '../directives';
import { sdl as scalarsSdl, resolvers as scalarResolvers } from './scalars';

export const baseTypeDef = concatAST([scalarsSdl, policyBaseSdl]);

export const typeDef = concatAST([baseTypeDef, directivesSdl]);

export const resolvers: GraphQLResolverMap = {
  ...scalarResolvers,
};
