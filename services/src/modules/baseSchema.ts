import {gql} from 'apollo-server-core';
import GraphQLJSON, {GraphQLJSONObject} from 'graphql-type-json';
import {concatAST} from 'graphql';
import {sdl as directivesSdl} from './directives';

export const baseTypeDef = gql`
    scalar JSON
    scalar JSONObject
`;

export const typeDef = concatAST([baseTypeDef, directivesSdl]);

export const resolvers = {
    JSON: GraphQLJSON,
    JSONObject: GraphQLJSONObject,
};
