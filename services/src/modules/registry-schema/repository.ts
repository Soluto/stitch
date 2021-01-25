import { getResourceRepository } from '../resource-repository';

export default (isRegistry = true) => getResourceRepository({ isRegistry });
