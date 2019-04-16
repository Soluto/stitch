import Source from "./source-type";

export default (client: KubernetesClient.ApiRoot) =>
  ({
    async getSchemas() {
      const nsResults = await client.api.v1.namespaces.get();
      const namespaces = nsResults.body.items.map((x: any) => x.metadata.name);
      const gqlResults = await Promise.all(
        namespaces.map(ns =>
          client.apis["graph.soluto"].v1.namespaces(ns).gqlschemas.get()
        )
      );

      const schemas = gqlResults
        .map((gql: any) =>
          (gql.body.items as object[]).map((x: any) => ({
            source: `${x.metadata.namespace}.${x.metadata.name}` as string,
            gql: x.spec.gql as string
          }))
        )
        .flat();

      return schemas.reduce(
        (acc, { source, gql }) => ({ ...acc, [source]: gql }),
        {}
      );
    },

    async registerSchema(name: string, gqlSchema: string) {
      throw "Not implemented";
    }
  } as Source);
