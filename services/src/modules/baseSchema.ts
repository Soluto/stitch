import {gql} from 'apollo-server-core';
import GraphQLJSON, {GraphQLJSONObject} from 'graphql-type-json';
import {GraphQLDate, GraphQLDateTime, GraphQLTime} from 'graphql-iso-date';
import {concatAST} from 'graphql';
import {sdl as directivesSdl} from './directives';

export const baseTypeDef = gql`
    scalar JSON
    scalar JSONObject

    scalar Date
    scalar Time
    scalar DateTime
`;

export const typeDef = concatAST([baseTypeDef, directivesSdl]);

export const resolvers = {
    JSON: GraphQLJSON,
    JSONObject: GraphQLJSONObject,
    Date: GraphQLDate,
    Time: GraphQLTime,
    DateTime: GraphQLDateTime,
};
