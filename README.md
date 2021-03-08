# Stitch

Stitch is a suite of GraphQL tools to make it easier to serve data through GraphQL for existing data sources.

## Gateway - Data Plane

A simple no-code way to create a graphql API for an existing data source (REST, Mongo, SQL, etc) to graphql. Your data model is described using a standard schema, with some extra magic stitch directives added, and you have your data source served through graphql.

## Registry - Control Plane

The registry is our attempt at solving the issue of collaborating on a single graph in a large organization. Independent teams can author their own schemas representing their own data sources, and the end result is one big collaborative graph for all of the organization's data.

## Documentation

- [Graph Composition Model](docs/graph_composition.md)
- [Data Sources](./docs/data_sources.md)
- [Arguments Injection](./docs/arguments_injection.md)
- [Scalars](./docs/scalars.md)
- [CLI](./cli)
- [Upstream Authentication](./docs/upstream_authentication.md)
- [Authentication](./docs/authentication.md)
- [Authorization](./docs/authorization.md)
- [Plugins](./docs/plugins.md)
- [Logging](./docs/logging.md)

## Development

### Running locally

Use the Tiltfile/docker-compose.yml located in `deployment/dev` to get a local env running quickly

### CI & Versioning

- Tests run on all pull requests
- When merging to master, CI will publish `ghcr.io/soluto/stitch:\$commit_sha` and `ghcr.io/soluto/stitch:latest`
- When pushing a version tag to the repo, CI will pick it up and create a docker image from the tagged commit tagged as the git tag. I.E. pushing v7.0 tag will create ghcr.io/soluto/stitch:7.0

[![Stitch](https://circleci.com/gh/Soluto/stitch.svg?style=svg)](https://circleci.com/gh/Soluto/stitch)
