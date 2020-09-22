# Feature Proposal: Plugins

## General

This spec describes plugin system that will make Stitch more flexible.

These are the domains that can be extended by using plugins.

1. Graphql Schema extension
2. Apollo Server extension
3. Fastify extension
4. Stitch Concepts Extensions

## Plugin Interface

Each Stitch plugin should include the subset of the following properties:

```yaml
name: My plugin
spec:
  graphql:
    typeDefs: ITypeDefinitions
    resolvers: IResolvers<any, TContext> | Array<IResolvers<any, TContext>>
    directiveResolvers: IDirectiveResolvers
    schemaDirectives: Record<string, typeof SchemaDirectiveVisitor>
    schemaDirectivesContext: Record<string, unknown>
  apollo:
    plugins: ApolloServerPlugin[]
  fastify: FastifyInstance => FastifyInstance
  stitch:
    argument_injection_builtIns: any[]
    upstreams: Upstream[]
    resourceGroupTransforms: ResourceGroup => ResourceGroup
```

## API Reference

---

### GraphQL

Plugins can extend GraphQL engine of Stitch by added custom directives, scalars or types with resolvers. Despite declaration-only schema enhancement that can be done using Registry this feature should be used when there is some new functionality that should be added to Stitch Graphql engine.

#### typeDefs

The definition of custom directives and/or scalars and types.
as defined [here](https://github.com/ardatan/graphql-tools/blob/e366a09e31760e6dc9f14239f953fa52a0ed53df/src/Interfaces.ts#L89)

---

#### resolvers

Custom scalars or types resolvers as defined [here](https://github.com/ardatan/graphql-tools/blob/e366a09e31760e6dc9f14239f953fa52a0ed53df/src/Interfaces.ts#L97)

---

#### directiveResolvers

> The custom directives can be implemented either using resolver function or defining class that inherits from SchemaDirectiveVisitor.

This property contains custom directives resolvers.

---

#### schemaDirectives

Custom directives inherit SchemaDirectiveVisitor

---

#### schemaDirectivesContext

The context sent to `SchemaDirectiveVisitor.visitSchemaDirectives` method

---

### Apollo Server

Apollo server plugins allows to add some event hooks. For example, metrics measurement or logging. Also, [base policy](../authorization.md) concept is implemented in Stitch using Apollo Server plugin.

#### Apollo Server Plugins

As defined [here](https://github.com/apollographql/apollo-server/blob/43bbb54da0e9e67d0bfef6e035783a18101b0bd4/packages/apollo-server-plugin-base/src/index.ts#L56)

---

> <h2>Another option is to add `ApolloServerConfig => ApolloServerConfig` transform function that will do all the changes mentioned above (GraphQL and Apollo Server sections).</h2>

---

### Fastify

Plugin can extend fastify server functionality. Apollo Server in current version uses [fastify](https://github.com/fastify/fastify) module at 2.x version. There is already Apollo Server version 3.0.0-alpha3 that depends on Fastify version 3.x.

Example to Fastify server extension can be `Authentication strategies` that are implemented hardcoded in Stitch.

To extend Fastify instance functionality the plugin should provide transformation function that receives instance as argument and returns modified instance. The transformation function can register [fastify plugins](https://github.com/fastify/fastify/blob/master/docs/Plugins.md), add [decorators](https://github.com/fastify/fastify/blob/master/docs/Decorators.md) and [hooks](https://github.com/fastify/fastify/blob/master/docs/Hooks.md)

---

### Stitch

#### argument_injection_builtins

This property allows to define built-in constants, functions or classes that will be available in [argument injection](../arguments_injection.md) strings.

For example, this code can be added to the property:

```js
const replaceNulls = value => (value === null || value === undefined ? 'N/A' : value);
```

And then use the function in argument injection strings:

```graphql
type Query {
  foo: String! @stub(value: "{replaceNulls(jwt.email)}")
}
```

---

#### upstreams

Upstreams are outgoing network interceptors that can enrich request. For example, OpenId upstream adds to outgoing request authorization header with Bearer JWT.

---

#### resourceGroupTransforms

Function that will be invoked at Registry. It receives [`ResourceGroup`](https://github.com/Soluto/stitch/blob/4fc839a1792e969203ae63ea8d6ace6553e5cdd6/services/src/modules/resource-repository/types.ts#L7) and returns modified object.

For example, the input resource group schema can contain directives as short-hand definitions and the transformation replace directives with some field definitions.

---

## Deployment

At first iteration plugins will be stored in filesystem the will be mount to gateway.

There are two options of plugin package:

### Web Assembly

Plugin is packed as WASM that exports function returning object (or its Promise) that implements the following interface. The advantage of this approach is language independency. But it's more complicated.

### CommonJS module

The plugin will be stored as folder containing `index.js` file. The default export of the file should be function that returns the plugin object or the Promise of it.
