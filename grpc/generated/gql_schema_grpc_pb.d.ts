// package: gqlschema
// file: gql_schema.proto

/* tslint:disable */

import * as grpc from "grpc";
import * as gql_schema_pb from "./gql_schema_pb";

interface IGqlSchemaService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    subscribe: IGqlSchemaService_ISubscribe;
}

interface IGqlSchemaService_ISubscribe extends grpc.MethodDefinition<gql_schema_pb.GqlSchemaSubscribeParams, gql_schema_pb.GqlSchemaMessage> {
    path: string; // "/gqlschema.GqlSchema/Subscribe"
    requestStream: boolean; // false
    responseStream: boolean; // true
    requestSerialize: grpc.serialize<gql_schema_pb.GqlSchemaSubscribeParams>;
    requestDeserialize: grpc.deserialize<gql_schema_pb.GqlSchemaSubscribeParams>;
    responseSerialize: grpc.serialize<gql_schema_pb.GqlSchemaMessage>;
    responseDeserialize: grpc.deserialize<gql_schema_pb.GqlSchemaMessage>;
}

export const GqlSchemaService: IGqlSchemaService;

export interface IGqlSchemaServer {
    subscribe: grpc.handleServerStreamingCall<gql_schema_pb.GqlSchemaSubscribeParams, gql_schema_pb.GqlSchemaMessage>;
}

export interface IGqlSchemaClient {
    subscribe(request: gql_schema_pb.GqlSchemaSubscribeParams, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<gql_schema_pb.GqlSchemaMessage>;
    subscribe(request: gql_schema_pb.GqlSchemaSubscribeParams, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<gql_schema_pb.GqlSchemaMessage>;
}

export class GqlSchemaClient extends grpc.Client implements IGqlSchemaClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
    public subscribe(request: gql_schema_pb.GqlSchemaSubscribeParams, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<gql_schema_pb.GqlSchemaMessage>;
    public subscribe(request: gql_schema_pb.GqlSchemaSubscribeParams, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<gql_schema_pb.GqlSchemaMessage>;
}
