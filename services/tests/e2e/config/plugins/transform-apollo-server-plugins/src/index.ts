import { PluginDefinition } from 'apollo-server-core';
import { ApolloServerPlugin } from 'apollo-server-plugin-base';

export function transformApolloServerPlugins(plugins: PluginDefinition[]): PluginDefinition[] {
  const myPlugin: ApolloServerPlugin = {
    requestDidStart: () => ({
      responseForOperation: requestContext => {
        if (requestContext.operationName === 'TransformApolloServerPluginsOperation') {
          return {
            data: {
              pl_foo: 'SUCCESS!',
            },
          };
        }
        return null;
      },
    }),
  };

  plugins.push(myPlugin);
  return plugins;
}
