import { gql } from 'apollo-server-core';
import {
  EmailAddressTypeDefinition,
  EmailAddressResolver,
  PhoneNumberTypeDefinition,
  PhoneNumberResolver,
} from 'graphql-scalars';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import { GraphQLDate, GraphQLDateTime, GraphQLTime } from 'graphql-iso-date';
import { IResolvers } from '@graphql-tools/utils';
import { policyScalarResolvers } from '../directives/policy';

export const sdl = gql`
  scalar JSON
  scalar JSONObject

  scalar Date
  scalar Time
  scalar DateTime

  ${EmailAddressTypeDefinition}
  ${PhoneNumberTypeDefinition}
`;

export const resolvers: IResolvers = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
  Date: GraphQLDate,
  Time: GraphQLTime,
  DateTime: GraphQLDateTime,
  EmailAddress: EmailAddressResolver,
  PhoneNumber: PhoneNumberResolver,
  ...policyScalarResolvers,
};
