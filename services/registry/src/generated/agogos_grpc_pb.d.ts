// package: gqlconfig
// file: agogos.proto

/* tslint:disable */

import * as grpc from "grpc";
import * as agogos_pb from "./agogos_pb";

interface IRegistryService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    subscribe: IRegistryService_ISubscribe;
}

interface IRegistryService_ISubscribe extends grpc.MethodDefinition<agogos_pb.SubscribeParams, agogos_pb.ConfigurationMessage> {
    path: string; // "/gqlconfig.Registry/Subscribe"
    requestStream: boolean; // false
    responseStream: boolean; // true
    requestSerialize: grpc.serialize<agogos_pb.SubscribeParams>;
    requestDeserialize: grpc.deserialize<agogos_pb.SubscribeParams>;
    responseSerialize: grpc.serialize<agogos_pb.ConfigurationMessage>;
    responseDeserialize: grpc.deserialize<agogos_pb.ConfigurationMessage>;
}

export const RegistryService: IRegistryService;

export interface IRegistryServer {
    subscribe: grpc.handleServerStreamingCall<agogos_pb.SubscribeParams, agogos_pb.ConfigurationMessage>;
}

export interface IRegistryClient {
    subscribe(request: agogos_pb.SubscribeParams, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<agogos_pb.ConfigurationMessage>;
    subscribe(request: agogos_pb.SubscribeParams, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<agogos_pb.ConfigurationMessage>;
}

export class RegistryClient extends grpc.Client implements IRegistryClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: object);
    public subscribe(request: agogos_pb.SubscribeParams, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<agogos_pb.ConfigurationMessage>;
    public subscribe(request: agogos_pb.SubscribeParams, metadata?: grpc.Metadata, options?: Partial<grpc.CallOptions>): grpc.ClientReadableStream<agogos_pb.ConfigurationMessage>;
}
