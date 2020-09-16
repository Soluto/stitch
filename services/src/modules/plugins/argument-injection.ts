import { ApolloServerPlugin } from 'apollo-server-plugin-base';
import { initBuiltIns } from '../arguments-injection';

export function createArgumentInjectionPlugin(): ApolloServerPlugin {
  return {
    serverWillStart() {
      return initBuiltIns();
    },
  };
}
