import { gql } from 'apollo-server-core';
import { IResolvers } from 'graphql-tools';
import * as _ from 'lodash';
import {
  plugins,
  argumentInjectionGlobals,
  loadPlugins,
  buildArgumentInjectionGlobals,
  transformResourceGroup,
  transformBaseSchema,
} from './apply-plugins';

export {
  argumentInjectionGlobals,
  loadPlugins,
  buildArgumentInjectionGlobals,
  transformResourceGroup,
  transformBaseSchema,
};

export function getPlugins() {
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
