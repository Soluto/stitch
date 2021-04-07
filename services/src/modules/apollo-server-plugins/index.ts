import { PluginDefinition } from 'apollo-server-core';
import { transformApolloServerPlugins as applyPluginsForApolloServerPlugins } from '../plugins';
import { createBasicPolicyPlugin } from './base-policy';
import { createLoggingPlugin } from './logging';
import { createMetricsPlugin } from './metrics';

export default function getPlugins(): PluginDefinition[] {
  const baseApolloServerPlugins = [createBasicPolicyPlugin, createLoggingPlugin, createMetricsPlugin];
  const plugins = applyPluginsForApolloServerPlugins(baseApolloServerPlugins);
  return plugins;
}
