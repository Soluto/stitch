import { concatAST, GraphQLSchema } from 'graphql';
import { ResourceGroup } from '../resource-repository';
import { sdl as stubSdl, directiveSchemaTransformer as stubDirectiveSchemaTransformer } from './stub';
import {
  sdl as localResolverSdl,
  directiveSchemaTransformer as localResolverDirectiveSchemaTransformer,
} from './local-resolver';
import {
  sdl as errorHandlerSdl,
  directiveSchemaTransformer as errorHandlerDirectiveSchemaTransformer,
} from './error-handler';
import {
  sdl as enumResolverSdl,
  directiveSchemaTransformer as enumResolverDirectiveSchemaTransformer,
} from './enum-resolver';
import { sdl as enumValueSdl, directiveSchemaTransformer as EnumValueDirective } from './enum-value';
import { sdl as restSdl, directiveSchemaTransformer as restDirectiveSchemaTransformer } from './rest';
import { sdl as gqlSdl, directiveSchemaTransformer as gqlDirectiveSchemaTransformer } from './gql';
// import { sdl as exportSdl, ExportDirective } from './export';
import { sdl as selectSdl, directiveSchemaTransformer as selectDirectiveSchemaTransformer } from './select';
import {
  policyBaseSdl,
  policySdl,
  policiesSdl,
  policyFieldSdl,
  policyQuerySdl,
  policyDirectiveSchemaTransformer,
  policiesDirectiveSchemaTransformer,
  policyQueryDirectiveSchemaTransformer,
  policyScalarResolvers,
} from './policy';

export const directiveMap: {
  [visitorName: string]: (schema: GraphQLSchema, context?: { resourceGroup: ResourceGroup }) => GraphQLSchema;
} = {
  stub: stubDirectiveSchemaTransformer,
  rest: restDirectiveSchemaTransformer,
  gql: gqlDirectiveSchemaTransformer,
  // export: ExportDirective,
  select: selectDirectiveSchemaTransformer,
  policy: policyDirectiveSchemaTransformer,
  policies: policiesDirectiveSchemaTransformer,
  policyQuery: policyQueryDirectiveSchemaTransformer,
  localResolver: localResolverDirectiveSchemaTransformer,
  errorHandler: errorHandlerDirectiveSchemaTransformer,
  enumResolver: enumResolverDirectiveSchemaTransformer,
  enumValue: EnumValueDirective,
};

export const sdl = concatAST([
  stubSdl,
  restSdl,
  gqlSdl,
  // exportSdl,
  selectSdl,
  policySdl,
  policiesSdl,
  policyQuerySdl,
  localResolverSdl,
  errorHandlerSdl,
  enumResolverSdl,
  enumValueSdl,
]);

export { policyScalarResolvers, policyBaseSdl, policyFieldSdl };
