import * as grpc from "grpc";
import sync$ from "./sync-service";
import { print } from "graphql/language/printer";
import {
  GqlSchemaMessage,
  GqlSchemaSubscribeParams
} from "../generated/gql_schema_pb";
import {
  IGqlSchemaServer,
  GqlSchemaService
} from "../generated/gql_schema_grpc_pb";

const PORT = process.env.GRPC_PORT || 4001;

class GqlSchemaSubscriptionServer implements IGqlSchemaServer {
  subscribe(call: grpc.ServerWriteableStream<GqlSchemaSubscribeParams>) {
    const subscription = sync$.subscribe(
      mergedSchema => {
        const gqlSchema = new GqlSchemaMessage();
        gqlSchema.setSchema(print(mergedSchema));
        call.write(gqlSchema);
      },
      () => {},
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
  server.addService(GqlSchemaService, new GqlSchemaSubscriptionServer());
  server.bind(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure());
  server.start();
  console.log(`🚀 GRPC Server ready at localhost:${PORT}`);
}
