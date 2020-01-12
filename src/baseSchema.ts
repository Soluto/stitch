import {gql} from 'apollo-server-core';
import {sdl as directivesSdl} from './directives';
import GraphQLJSON, {GraphQLJSONObject} from 'graphql-type-json';

export const typeDef = gql`
    scalar JSON
    scalar JSONObject

    ${directivesSdl}
`;

export const resolvers = {
    JSON: GraphQLJSON,
    JSONObject: GraphQLJSONObject,
};
