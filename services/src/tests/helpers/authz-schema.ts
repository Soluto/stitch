export const onlyAdminPolicy = () => ({
  metadata: { namespace: 'ns', name: 'onlyAdmin' },
  type: 'opa',
  code: `
    default allow = false
    allow {
      input.args.role == "admin"
    }
  `,
  args: {
    role: 'String',
  },
});

export const jwtNamePolicy = () => ({
  metadata: { namespace: 'ns', name: 'jwtName' },
  type: 'opa',
  code: `
  default allow = false
  allow {
    input.args.allowedName == input.args.jwtName
  }
`,
  args: {
    allowedName: 'String',
    jwtName: 'String',
  },
});

export const createPolicyMutation = `
mutation CreatePolicy($policy: PolicyInput!) {
  updatePolicies(input: [$policy]) {
    success
  }
}`;

export const getSchema = () => ({
  metadata: { namespace: 'ns', name: 'user' },
  schema: `
    type User {
      firstName: String
      lastName: String @policy(namespace: "ns", name: "onlyAdmin", args: { role: "{source.role}" })
      role: String
    }

    type ArbitraryData {
      arbitraryField: String @policy(
        namespace: "ns",
        name: "jwtName",
        args: {
          jwtName: "{jwt.name}",
          allowedName: "Varg"
        }
      )
    }

    type Query {
      user: User! @stub(value: ${userQueryStub('normal')})
      userAdmin: User! @stub(value: ${userQueryStub('admin')})
      arbitraryData: ArbitraryData! @stub(value: { arbitraryField: "arbitraryValue" })
    }
  `,
});

const userQueryStub = (userRole: string) => `{
  firstName: "John"
  lastName: "Smith"
  role: "${userRole}"
}`;

export const createSchemaMutation = `
mutation CreateSchema($schema: SchemaInput!) {
  updateSchemas(input: [$schema]) {
    success
  }
}`;

export const getUserQuery = (queryType: string) => `
  query {
    ${queryType} {
      firstName
      lastName
      role
    }
  }
`;

export const getArbitraryDataQuery = () => `
  query {
    arbitraryData {
      arbitraryField
    }
  }
`;
