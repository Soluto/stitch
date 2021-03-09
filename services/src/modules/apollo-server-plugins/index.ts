import { PluginDefinition } from 'apollo-server-core';
import * as fastify from 'fastify';
import { transformApolloServerPlugins as applyPluginsForApolloServerPlugins } from '../plugins';
import { createBasicPolicyPlugin } from './base-policy';
import { createLoggingPlugin } from './logging';
import { createMetricsPlugin } from './metrics';

export default function getPlugins(fastifyInstance: fastify.FastifyInstance): PluginDefinition[] {
  const baseApolloServerPlugins = [
    createBasicPolicyPlugin,
    createLoggingPlugin(),
    createMetricsPlugin(fastifyInstance),
  ];
  const plugins = applyPluginsForApolloServerPlugins(baseApolloServerPlugins);
  return plugins;
}
