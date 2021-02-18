import pLimit from 'p-limit';
import * as _ from 'lodash';
import { GraphQLError } from 'graphql';
import logger from '../../logger';
import { fetchRemoteGqlSchema } from '../../directives/gql/introspection';
import getResourceRepository from '../repository';
import { RegistryRequestContext } from '..';

const singleton = pLimit(1);

export default async function (url: string, context: RegistryRequestContext) {
  const registryResourceRepository = getResourceRepository();
  return singleton(async () => {
    logger.info(`Proceeding remote schema refresh request...`);
    try {
      logger.trace('Fetching latest resource group...');
      const { resourceGroup: registryRg } = await registryResourceRepository.fetchLatest();

      if (!registryRg.remoteSchemas) {
        throw new Error(`Unknown url: ${url}`);
      }
      const index = _.findIndex(registryRg.remoteSchemas, { url });
      if (index < 0) {
        throw new Error(`Unknown url: ${url}`);
      }
      const schema = await fetchRemoteGqlSchema(url, registryRg, context);
      registryRg.remoteSchemas.splice(index, 1, { url, schema });

      const gatewayResourceRepository = getResourceRepository(false);
      const { resourceGroup: gatewayRg } = await gatewayResourceRepository.fetchLatest();
      gatewayRg.remoteSchemas = registryRg.remoteSchemas;

      logger.trace('Saving resource group...');
      await Promise.all([
        registryResourceRepository.update(registryRg, { registry: true }),
        registryResourceRepository.update(gatewayRg),
      ]);
    } catch (err) {
      const message = `Remote schema refresh request failed: ${err}`;
      logger.error({ err }, message);
      throw new GraphQLError(message);
    }
    return { success: true };
  });
}
