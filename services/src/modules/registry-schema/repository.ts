import { S3ResourceRepository } from '../resource-repository';

export default S3ResourceRepository.fromEnvironment({ isRegistry: true });
