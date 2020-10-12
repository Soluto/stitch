# Plugins

## General

Plugins allows to extend Stitch functionality. Plugin can modify resource group, add predefined globals to [Argument Injection](./arguments_injection.md) mechanism. In future we plan to allow modify Fastify and Apollo servers configuration, add and modify Graphql schema and more.

## Installation

Stitch loads plugins from specific location that can be configured by environment variable `PLUGINS_DIR`. Each file or folder of the root level are tried to be loaded. It can be single javascript file, directory containing `index.js` file or directory with `package.json` file with `main` property.

The plugin file cannot require npm modules. It should export one of the following:

1. Object implementing StitchPlugin interface (see below)
2. Promise to the object as described in (1)
3. Parameterless function returning object or promise to the object as described in (1)

## StitchPlugin interface

```typescript
export interface StitchPlugin {
  name?: string;

  addArgumentInjectionGlobals?(): ValueOrPromise<Record<string, unknown>>;

  transformResourcesUpdates?(resourcesUpdates: Partial<ResourceGroup>): ValueOrPromise<Partial<ResourceGroup>>;
  transformResourceGroup?(resourceGroup: ResourceGroup): ValueOrPromise<ResourceGroup>;
}
```

> Plugin name is optional and by default is the file or folder name.

## API Reference

### addArgumentInjectionGlobals

Returns object or promise to the object that will be available in [Argument Injection](./arguments_injection.md) clauses as `globals` constant.

Example:

Plugin:

```javascript
{
  addArgumentInjectionGlobals() {
    return {
      doublePad: (str, pad) => `${pad}${pad}${str}${pad}${pad}`,
    };
  },
}
```

GraphQL Schema:

```graphql
type Query {
  foo(str: String!): String! @localResolver(value: "{globals.doublePad(args.str, '_')}")
}
```

GraphQL Query:

```graphql
query {
  foo(str: "HELLO")
}
```

Result: `{ foo: "__HELLO__" }`.

## transformResourcesUpdates

Allows to transform the part of resource group being mutating by call to Registry service. This method receives part of `ResourceGroup` and return the same type of the promise to it.

For example the following plugin removes all policies of resource group:

```javascript
{
  name: 'remove-policies'
  transformResourcesUpdates(rg) {
    return { ...rg, policies: [] };
  }
}
```

## transformResourceGroup

Allows to transform the resource group. This transformation is done every time the resource group is changed mutation call to Registry service.

For example this plugin adds base policy if not exists:

```javascript
{
  transformResourceGroup(rg) {
    if (rg.basePolicy) return rg;
    return { ...rg, basePolicy: {
      namespace: 'ns',
      name: 'base',
      args: {
        user: '{jwt.sub}',
      },
    }};
  }
}
```

There are some more plugins examples [here](https://github.com/Soluto/stitch/tree/master/services/tests/e2e/config/plugins).
