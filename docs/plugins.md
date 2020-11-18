# Plugins

## General

Plugins allow extending Stitch functionality. Plugin can modify the resource group, and add predefined globals to the [Argument Injection](./arguments_injection.md) mechanism. In the future, we plan to allow modifying Fastify and Apollo servers configurations, add and modify Graphql schema and more.

## Installation

Stitch loads plugins from a specific location that can be configured by the environment variable `PLUGINS_DIR`.
Each file or folder at the root level is loaded. It can be a single javascript file, a directory containing `index.js` file, or a directory with a `package.json` file that has the `main` property.

The plugin file cannot require npm modules. It should export one of the following:

1. An object implementing the StitchPlugin interface (see below)
2. A promise to the object as described in (1)
3. A parameterless function returning an object, or a promise to the object as described in (1)

## StitchPlugin interface

```typescript
export interface StitchPlugin {
  name?: string;

  addArgumentInjectionGlobals?(): ValueOrPromise<Record<string, unknown>>;

  transformResourceGroup?(resourceGroup: ResourceGroup): ValueOrPromise<ResourceGroup>;
}
```

> The plugin name is optional, and by default it is set to the file or folder name.

## API Reference

### addArgumentInjectionGlobals

Returns an object or a promise to the object that will be available in [Argument Injection](./arguments_injection.md) clauses under the `globals` constant.

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

## transformResourceGroup

Allows transforming the resource group. This transformation is done every time the resource group is changed by a mutation call to the Registry service.

For example this plugin adds a base policy if one does not exist:

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
