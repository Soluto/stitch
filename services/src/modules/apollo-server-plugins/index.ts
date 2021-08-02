import { PluginDefinition } from 'apollo-server-core';
import { transformApolloServerPlugins as applyPluginsForApolloServerPlugins } from '../plugins';
import { createBasicPolicyPlugin } from './base-policy';
import { createIntrospectionQueryPolicyPlugin } from './introspection-query-policy';
import { createLoggingPlugin } from './logging';
import { createMetricsPlugin } from './metrics';

export default function getPlugins(): PluginDefinition[] {
  const baseApolloServerPlugins = [
    createBasicPolicyPlugin,
    createLoggingPlugin,
    createMetricsPlugin,
    createIntrospectionQueryPolicyPlugin,
  ];
  const plugins = applyPluginsForApolloServerPlugins(baseApolloServerPlugins);
  return plugins;
}
