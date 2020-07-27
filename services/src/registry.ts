import { ApolloServer, gql, IResolvers } from 'apollo-server-fastify';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import * as fastify from 'fastify';
import pLimit from 'p-limit';
import { S3ResourceRepository, ResourceGroup, applyResourceGroupUpdates } from './modules/resource-repository';
import * as config from './modules/config';
import { validateResourceGroupOrThrow } from './modules/validation';
import logger from './modules/logger';
import * as opaHelper from './modules/opa-helper';
import PolicyAttachmentsGenerator from './modules/policy-attachments-generator';
import { handleSignals, handleUncaughtErrors } from './modules/shutdown-handler';
import { createSchemaConfig } from './modules/graphql-service';
// Importing directly from types because of a typescript or ts-jest bug that re-exported enums cause a runtime error for being undefined
// https://github.com/kulshekhar/ts-jest/issues/281
import { PolicyType, PolicyQueryVariables, PolicyArgsObject } from './modules/resource-repository/types';

const typeDefs = gql`
  scalar JSON
  scalar JSONObject

  # General

  input ResourceMetadataInput {
    namespace: String!
    name: String!
  }

  type Result {
    success: Boolean!
  }

  input ResourceGroupInput {
    schemas: [SchemaInput!]
    upstreams: [UpstreamInput!]
    upstreamClientCredentials: [UpstreamClientCredentialsInput!]
    policies: [PolicyInput!]
  }

  type Query {
    validateResourceGroup(input: ResourceGroupInput!): Result
    validateSchemas(input: [SchemaInput!]!): Result
    validateUpstreams(input: [UpstreamInput!]!): Result
    validateUpstreamClientCredentials(input: [UpstreamClientCredentialsInput!]!): Result
    validatePolicies(input: [PolicyInput!]!): Result
  }

  type Mutation {
    updateResourceGroup(input: ResourceGroupInput!): Result
    updateSchemas(input: [SchemaInput!]!): Result
    updateUpstreams(input: [UpstreamInput!]!): Result
    updateUpstreamClientCredentials(input: [UpstreamClientCredentialsInput!]!): Result
    updatePolicies(input: [PolicyInput!]!): Result
    updateBasePolicy(input: BasePolicyInput!): Result
  }

  # Schemas

  input SchemaInput {
    metadata: ResourceMetadataInput!
    schema: String!
  }

  # Upstreams

  enum AuthType {
    ActiveDirectory
  }

  """
  GraphQL doesn't support unions for input types, otherwise this would be a union of different auth types.
  Instead, the AuthType enum indicates which auth type is needed, and there's a property which corresponds to each auth type, which we validate in the registry.
  """
  input AuthInput {
    type: AuthType!
    activeDirectory: ActiveDirectoryAuthInput!
  }

  input ActiveDirectoryAuthInput {
    authority: String!
    resource: String!
  }

  input UpstreamInput {
    metadata: ResourceMetadataInput!
    host: String!
    auth: AuthInput!
  }

  # Upstream client credentials

  input ActiveDirectoryCredentials {
    authority: String!
    clientId: String!
    clientSecret: String!
  }

  """
  GraphQL doesn't support unions for input types, otherwise this would be a union of different auth types.
  Instead, the AuthType enum indicates which auth type is needed, and there's a property which corresponds to each auth type, which we validate in the registry.
  """
  input UpstreamClientCredentialsInput {
    metadata: ResourceMetadataInput!
    authType: AuthType!
    activeDirectory: ActiveDirectoryCredentials!
  }

  # Policy

  enum PolicyType {
    opa
  }

  input PolicyQueryInput {
    gql: String!
    variables: JSONObject
  }

  input PolicyInput {
    metadata: ResourceMetadataInput!
    type: PolicyType!
    shouldOverrideBasePolicy: Boolean
    code: String!
    args: JSONObject
    query: PolicyQueryInput
  }

  input BasePolicyInput {
    namespace: String!
    name: String!
    args: JSONObject
  }
`;

export interface ResourceMetadataInput {
  namespace: string;
  name: string;
}

interface ResourceGroupInput {
  schemas?: SchemaInput[];
  upstreams?: UpstreamInput[];
  upstreamClientCredentials?: UpstreamClientCredentialsInput[];
  policies?: PolicyInput[];
}

interface SchemaInput {
  metadata: ResourceMetadataInput;
  schema: string;
}

export enum AuthType {
  ActiveDirectory = 'ActiveDirectory',
}

interface ActiveDirectoryAuthInput {
  authority: string;
  resource: string;
}

interface UpstreamInput {
  metadata: ResourceMetadataInput;
  host: string;
  auth: {
    type: AuthType;
    activeDirectory: ActiveDirectoryAuthInput;
  };
}

interface UpstreamClientCredentialsInput {
  metadata: ResourceMetadataInput;
  authType: AuthType;
  activeDirectory: {
    authority: string;
    clientId: string;
    clientSecret: string;
  };
}

interface PolicyQueryInput {
  gql: string;
  variables?: PolicyQueryVariables;
}

export interface PolicyInput {
  metadata: ResourceMetadataInput;
  type: PolicyType;
  shouldOverrideBasePolicy?: boolean;
  code: string;
  args?: PolicyArgsObject;
  query?: PolicyQueryInput;
}

interface BasePolicyInput {
  namespace: string;
  name: string;
  args?: PolicyArgsObject;
}

const resourceRepository = S3ResourceRepository.fromEnvironment({ isRegistry: true });

async function fetchAndValidate(updates: Partial<ResourceGroup>): Promise<ResourceGroup> {
  const { resourceGroup } = await resourceRepository.fetchLatest();
  const newRg = applyResourceGroupUpdates(resourceGroup, updates);
  validateResourceGroupOrThrow(newRg);
  createSchemaConfig(newRg);

  return newRg;
}

const singleton = pLimit(1);
const resolvers: IResolvers = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
  Query: {
    async validateResourceGroup(_, args: { input: ResourceGroupInput }) {
      const policyAttachments = new PolicyAttachmentsGenerator(resourceRepository);
      await policyAttachments.generate(args?.input?.policies ?? []);

      try {
        await fetchAndValidate(args.input);
      } finally {
        await policyAttachments.cleanup();
      }

      return { success: true };
    },
    async validateSchemas(_, args: { input: SchemaInput[] }) {
      await fetchAndValidate({ schemas: args.input });

      return { success: true };
    },
    async validateUpstreams(_, args: { input: UpstreamInput[] }) {
      await fetchAndValidate({ upstreams: args.input });

      return { success: true };
    },
    async validateUpstreamClientCredentials(_, args: { input: UpstreamClientCredentialsInput[] }) {
      await fetchAndValidate({ upstreamClientCredentials: args.input });

      return { success: true };
    },
    async validatePolicies(_, args: { input: PolicyInput[] }) {
      const policyAttachments = new PolicyAttachmentsGenerator(resourceRepository);
      await policyAttachments.generate(args.input);

      try {
        await fetchAndValidate({ policies: args.input });
      } finally {
        await policyAttachments.cleanup();
      }

      return { success: true };
    },
  },
  Mutation: {
    updateResourceGroup(_, args: { input: ResourceGroupInput }) {
      return singleton(async () => {
        const policyAttachments = new PolicyAttachmentsGenerator(resourceRepository);
        await policyAttachments.generate(args?.input?.policies ?? []);

        try {
          const rg = await fetchAndValidate(args.input);

          await policyAttachments.writeToRepo();
          await resourceRepository.update(rg);
        } finally {
          await policyAttachments.cleanup();
        }

        return { success: true };
      });
    },
    updateSchemas(_, args: { input: SchemaInput[] }) {
      return singleton(async () => {
        const rg = await fetchAndValidate({ schemas: args.input });
        await resourceRepository.update(rg);

        return { success: true };
      });
    },
    updateUpstreams(_, args: { input: UpstreamInput[] }) {
      return singleton(async () => {
        const rg = await fetchAndValidate({ upstreams: args.input });
        await resourceRepository.update(rg);

        return { success: true };
      });
    },
    updateUpstreamClientCredentials(_, args: { input: UpstreamClientCredentialsInput[] }) {
      return singleton(async () => {
        const rg = await fetchAndValidate({ upstreamClientCredentials: args.input });
        await resourceRepository.update(rg);

        return { success: true };
      });
    },
    updatePolicies(_, args: { input: PolicyInput[] }) {
      return singleton(async () => {
        const policyAttachments = new PolicyAttachmentsGenerator(resourceRepository);
        await policyAttachments.generate(args.input);

        try {
          const rg = await fetchAndValidate({ policies: args.input });

          await policyAttachments.writeToRepo();
          await resourceRepository.update(rg);
        } finally {
          await policyAttachments.cleanup();
        }

        return { success: true };
      });
    },
    updateBasePolicy(_, args: { input: BasePolicyInput }) {
      return singleton(async () => {
        const rg = await fetchAndValidate({ basePolicy: args.input });
        await resourceRepository.update(rg);

        return { success: true };
      });
    },
  },
};

export const app = new ApolloServer({
  typeDefs,
  resolvers,
  tracing: config.enableGraphQLTracing,
  playground: config.enableGraphQLPlayground,
  introspection: config.enableGraphQLIntrospection,
});

async function run() {
  await opaHelper.initializeForRegistry();

  logger.info('Stitch registry booting up...');
  const server = fastify();
  server.register(app.createHandler({ path: '/graphql' }));
  const address = await server.listen(config.httpPort, '0.0.0.0');
  logger.info({ address }, 'Stitch registry started');

  handleSignals(() => app.stop());
  handleUncaughtErrors();
}

// Only run when file is being executed, not when being imported
if (require.main === module) {
  run();
}
