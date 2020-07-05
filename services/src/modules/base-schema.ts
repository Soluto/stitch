import { gql } from 'apollo-server-core';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { GraphQLDate, GraphQLDateTime, GraphQLTime } from 'graphql-iso-date';
import { concatAST } from 'graphql';
import { GraphQLResolverMap } from 'apollo-graphql';
import { sdl as directivesSdl } from './directives';

export const baseTypeDef = gql`
  scalar JSON
  scalar JSONObject

  scalar Date
  scalar Time
  scalar DateTime

  type PolicyResult {
    allow: Boolean!
  }

  type Policy {
    default: PolicyResult!
  }
`;

export const typeDef = concatAST([baseTypeDef, directivesSdl]);

export const resolvers: GraphQLResolverMap = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
  Date: GraphQLDate,
  Time: GraphQLTime,
  DateTime: GraphQLDateTime,
};
