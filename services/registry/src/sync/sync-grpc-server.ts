import * as grpc from "grpc";
import { combineLatest, Observable } from "rxjs";
import {
    ConfigurationMessage,
    Schema,
    SubscribeParams,
    Upstream,
    UpstreamAuthentication,
    UpstreamAuthCredentials
} from "../generated/agogos_pb";
import { IRegistryServer, RegistryService } from "../generated/agogos_grpc_pb";

import syncSchema$ from "./sync-schemas";
import syncUpstreams$ from "./sync-upstreams";
import syncUpstreamAuthCredentials$ from "./sync-upstream-auth-credentials";
import { AgogosConfiguration } from "./object-types";

const PORT = process.env.GRPC_PORT || 4001;

// TODO: make this more general
const syncConfiguration$: Observable<AgogosConfiguration> = combineLatest(
    [syncSchema$, syncUpstreams$, syncUpstreamAuthCredentials$],
    (schema, upstreams, upstreamAuthCredentials) => ({
        schema,
        upstreams,
        upstreamAuthCredentials
    })
);

class GqlConfigurationSubscriptionServer implements IRegistryServer {
    subscribe(call: grpc.ServerWriteableStream<SubscribeParams>) {
        const subscription = syncConfiguration$.subscribe(
            (configuration: AgogosConfiguration) => {
                const gqlSchema = new Schema();
                gqlSchema.setDefinition(configuration.schema);

                // TODO: extract to function
                const upstreams: Upstream[] = Object.values(
                    configuration.upstreams
                ).map(ep => {
                    const upstream = new Upstream();
                    upstream.setHost(ep.host);

                    const upstreamAuth = new UpstreamAuthentication();
                    // FIXME: get from ep
                    upstreamAuth.setAuthType(ep.auth.authType);
                    upstreamAuth.setAuthority(ep.auth.authority);
                    upstreamAuth.setScope(ep.auth.scope);
                    upstream.setAuth(upstreamAuth);

                    return upstream;
                });

                // TODO: extract to function
                const upstreamsAuthCredentials: UpstreamAuthCredentials[] = Object.values(
                    configuration.upstreamAuthCredentials
                ).map(ap => {
                    const upstreamAuthCredentials = new UpstreamAuthCredentials();
                    upstreamAuthCredentials.setAuthType(ap.authType);
                    upstreamAuthCredentials.setAuthority(ap.authority);
                    upstreamAuthCredentials.setClientId(ap.clientId);
                    upstreamAuthCredentials.setClientSecret(ap.clientSecret);

                    return upstreamAuthCredentials;
                });

                const configurationMessage = new ConfigurationMessage();
                configurationMessage.setSchema(gqlSchema);
                configurationMessage.setUpstreamsList(upstreams);
                configurationMessage.setUpstreamAuthCredentialsList(
                    upstreamsAuthCredentials
                );

                call.write(configurationMessage);
            },
            e => {
                console.log("====================================");
                console.log(e);
                console.log("====================================");
            },
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
    server.addService(RegistryService, new GqlConfigurationSubscriptionServer());
    server.bind(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure());
    server.start();
    console.log(`🚀 GRPC Server ready at localhost:${PORT}`);
}
