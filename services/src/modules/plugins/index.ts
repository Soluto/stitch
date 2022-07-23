import { gql } from 'apollo-server-core';
import { IResolvers } from '@graphql-tools/utils';
import * as _ from 'lodash';
import {
  plugins,
  argumentInjectionGlobals,
  loadPlugins,
  buildArgumentInjectionGlobals,
  transformResourceGroup,
  transformBaseSchema,
  transformApolloServerPlugins,
} from './apply-plugins';
import { PluginMetadata } from './types';

export {
  argumentInjectionGlobals,
  loadPlugins,
  buildArgumentInjectionGlobals,
  transformResourceGroup,
  transformBaseSchema,
  transformApolloServerPlugins,
};

export function getPlugins(): PluginMetadata[] {
  return _.sortBy(
    plugins.map(({ name, version }) => ({ name, version })),
    ['name']
  );
}

export const pluginsSdl = gql`
  type PluginMetadata {
    name: String!
    version: String!
  }

  type Query {
    plugins: [PluginMetadata!]!
  }
`;

export const pluginsResolvers: IResolvers = {
  Query: {
    plugins: getPlugins,
  },
};
