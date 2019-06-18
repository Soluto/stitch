import * as grpc from "grpc";
import {
    combineLatest
} from "rxjs";
import {
    GqlConfigurationMessage,
    GqlSchema,
    GqlConfigurationSubscribeParams,
    GqlEndpoint,
    GqlEndpointAuthentication,
    GqlAuthProvider
} from "../generated/gql_configuration_pb";
import {
    IGqlConfigurationServer,
    GqlConfigurationService
} from "../generated/gql_configuration_grpc_pb";

import syncSchema$ from "./sync-gqlSchemas";
import syncEndpoint$ from "./sync-gqlEndpoints";
import syncAuthProvider$ from "./sync-gqlAuthProviders";

const PORT = process.env.GRPC_PORT || 4001;

// TODO: make this more general
const syncGqlConfiguration$ = combineLatest([
    syncSchema$,
    syncEndpoint$,
    syncAuthProvider$,
], (schema, endpoints, authProviders) => ({ schema, endpoints, authProviders }));

class GqlConfigurationSubscriptionServer implements IGqlConfigurationServer {
    subscribe(call: grpc.ServerWriteableStream<GqlConfigurationSubscribeParams>) {
        const subscription = syncGqlConfiguration$.subscribe(
            configuration => {
                const gqlSchema = new GqlSchema();
                gqlSchema.setGql(configuration.schema);

                // TODO: extract to function
                const gqlEndpoints: GqlEndpoint[] = Object.values(configuration.endpoints).map(ep => {
                    const gqlEndpoint = new GqlEndpoint();
                    gqlEndpoint.setHost(ep.host);

                    const gqlEndpointAuth = new GqlEndpointAuthentication();
                    // FIXME: get from ep
                    gqlEndpointAuth.setAuthType(ep.auth.authType);
                    gqlEndpointAuth.setAuthority(ep.auth.authority);
                    gqlEndpointAuth.setScope(ep.auth.scope);
                    gqlEndpoint.setAuth(gqlEndpointAuth);

                    return gqlEndpoint;
                });

                // TODO: extract to function
                const gqlAuthProviders: GqlAuthProvider[] = Object.values(configuration.authProviders).map(ap => {
                    const gqlAuthProvider = new GqlAuthProvider();
                    gqlAuthProvider.setAuthType(ap.authType);
                    gqlAuthProvider.setAuthority(ap.authority);
                    gqlAuthProvider.setClientId(ap.client_id);
                    gqlAuthProvider.setClientSecret(ap.client_secret);

                    return gqlAuthProvider;
                });


                const gqlConfiguration = new GqlConfigurationMessage();
                gqlConfiguration.setSchema(gqlSchema);
                gqlConfiguration.setEndpointsList(gqlEndpoints);
                gqlConfiguration.setAuthProvidersList(gqlAuthProviders);

                call.write(gqlConfiguration);
            },
            () => { },
            () => call.end()
        );

        const endStream = () => subscription.unsubscribe();
        call.on("close", endStream);
        call.on("end", endStream);
        call.on("error", endStream);
    }
}

export function startGrpcServer() {
    var server = new grpc.Server();
    server.addService(GqlConfigurationService, new GqlConfigurationSubscriptionServer());
    server.bind(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure());
    server.start();
    console.log(`🚀 GRPC Server ready at localhost:${PORT}`);
}
