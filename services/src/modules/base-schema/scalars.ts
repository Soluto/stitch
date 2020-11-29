import { gql } from 'apollo-server-core';
import {
  EmailAddressTypeDefinition,
  EmailAddressResolver,
  PhoneNumberTypeDefinition,
  PhoneNumberResolver,
} from 'graphql-scalars';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { GraphQLDate, GraphQLDateTime, GraphQLTime } from 'graphql-iso-date';
import { GraphQLResolverMap } from 'apollo-graphql';

export const sdl = gql`
  scalar JSON
  scalar JSONObject

  scalar Date
  scalar Time
  scalar DateTime

  ${EmailAddressTypeDefinition}
  ${PhoneNumberTypeDefinition}
`;

export const resolvers: GraphQLResolverMap = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
  Date: GraphQLDate,
  Time: GraphQLTime,
  DateTime: GraphQLDateTime,
  EmailAddress: EmailAddressResolver,
  PhoneNumber: PhoneNumberResolver,
};
