// package: gqlconfig
// file: gql_configuration.proto

/* tslint:disable */

import * as grpc from "grpc";
import * as gql_configuration_pb from "./gql_configuration_pb";

interface IGqlConfigurationService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    subscribe: IGqlConfigurationService_ISubscribe;
}

interface IGqlConfigurationService_ISubscribe extends grpc.MethodDefinition<gql_configuration_pb.GqlConfigurationSubscribeParams, gql_configuration_pb.GqlConfigurationMessage> {
    path: string; // "/gqlconfig.GqlConfiguration/Subscribe"
    requestStream: boolean; // false
    responseStream: boolean; // true
    requestSerialize: grpc.serialize<gql_configuration_pb.GqlConfigurationSubscribeParams>;
    requestDeserialize: grpc.deserialize<gql_configuration_pb.GqlConfigurationSubscribeParams>;
    responseSerialize: grpc.serialize<gql_configuration_pb.GqlConfigurationMessage>;
    responseDeserialize: grpc.deserialize<gql_configuration_pb.GqlConfigurationMessage>;
}

export const GqlConfigurationService: IGqlConfigurationService;

export interface IGqlConfigurationServer {
    subscribe: grpc.handleServerStreamingCall<gql_configuration_pb.GqlConfigurationSubscribeParams, gql_configuration_pb.GqlConfigurationMessage>;
}

export interface IGqlConfigurationClient {
    subscribe(request: gql_configuration_pb.GqlConfigurationSubscribeParams, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<gql_configuration_pb.GqlConfigurationMessage>;
    subscribe(request: gql_configuration_pb.GqlConfigurationSubscribeParams, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<gql_configuration_pb.GqlConfigurationMessage>;
}

export class GqlConfigurationClient extends grpc.Client implements IGqlConfigurationClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
    public subscribe(request: gql_configuration_pb.GqlConfigurationSubscribeParams, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<gql_configuration_pb.GqlConfigurationMessage>;
    public subscribe(request: gql_configuration_pb.GqlConfigurationSubscribeParams, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<gql_configuration_pb.GqlConfigurationMessage>;
}
