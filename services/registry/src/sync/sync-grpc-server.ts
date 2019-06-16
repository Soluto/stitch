import * as grpc from "grpc";
import {
    combineLatest
} from "rxjs";
import syncSchema$ from "./sync-gqlSchemas";
import {
    GqlConfigurationMessage,
    GqlSchema,
    GqlConfigurationSubscribeParams
} from "../generated/gql_configuration_pb";
import {
    IGqlConfigurationServer,
    GqlConfigurationService
} from "../generated/gql_configuration_grpc_pb";

const PORT = process.env.GRPC_PORT || 4001;

// TODO: make this more general
const syncGqlConfiguration$ = combineLatest([
    syncSchema$
], (schema) => ({ schema }));

class GqlConfigurationSubscriptionServer implements IGqlConfigurationServer {
    subscribe(call: grpc.ServerWriteableStream<GqlConfigurationSubscribeParams>) {
        const subscription = syncGqlConfiguration$.subscribe(
            configuration => {
                const gqlSchema = new GqlSchema();
                gqlSchema.setGql(configuration.schema);

                const gqlConfiguration = new GqlConfigurationMessage();
                gqlConfiguration.setSchema(gqlSchema);

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
