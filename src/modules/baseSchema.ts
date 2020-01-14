import {gql} from 'apollo-server-core';
import {sdl as directivesSdl} from './directives';
import GraphQLJSON, {GraphQLJSONObject} from 'graphql-type-json';

export const baseTypeDef = gql`
    scalar JSON
    scalar JSONObject
`;

export const typeDef = gql`
    ${directivesSdl}
`;

export const resolvers = {
    JSON: GraphQLJSON,
    JSONObject: GraphQLJSONObject,
};
