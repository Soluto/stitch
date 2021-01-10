import * as config from '../config';
import logger from '../logger';
import {
  CompositeResourceRepository,
  FileSystemResourceRepository,
  IResourceRepository,
  ResourceRepository,
  S3ResourceRepository,
} from '.';

export default function getResourceRepository(options?: { isRegistry: boolean }): IResourceRepository {
  const repositories: ResourceRepository[] = [];

  if (config.useS3ResourceRepository) {
    repositories.push(S3ResourceRepository.fromEnvironment(options));
  }

  if (config.useFileSystemResourceRepository) {
    repositories.push(FileSystemResourceRepository.fromEnvironment(options));
  }

  switch (repositories.length) {
    case 0:
      logger.fatal('Must enable at least one resource repository');
      throw new Error('Must enable at least one resource repository');
    case 1:
      return repositories[0];
    default:
      if (options?.isRegistry) {
        logger.fatal('Registry cannot have more than one resource repository');
        throw new Error('Registry cannot have more than one resource repository');
      }
      return new CompositeResourceRepository(repositories);
  }
}
