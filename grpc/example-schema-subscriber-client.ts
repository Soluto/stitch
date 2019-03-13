import * as grpc from "grpc";
import { GqlSchemaClient } from "./generated-ts/gql_schema_grpc_pb";
import {
  GqlSchemaMessage,
  GqlSchemaSubscribeParams
} from "./generated-ts/gql_schema_pb";

const client = new GqlSchemaClient(
  "localhost:4001",
  grpc.credentials.createInsecure()
);

const stream = client.subscribe(new GqlSchemaSubscribeParams());
stream.on("data", (data: GqlSchemaMessage) => {
  console.log("SCHEMA START");
  console.log(data.getSchema());
  console.log("SCHEMA END\n\n");
});
