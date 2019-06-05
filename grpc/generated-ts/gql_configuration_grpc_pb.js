// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var gql_configuration_pb = require('./gql_configuration_pb.js');

function serialize_gqlconfig_GqlConfigurationMessage(arg) {
  if (!(arg instanceof gql_configuration_pb.GqlConfigurationMessage)) {
    throw new Error('Expected argument of type gqlconfig.GqlConfigurationMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_gqlconfig_GqlConfigurationMessage(buffer_arg) {
  return gql_configuration_pb.GqlConfigurationMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_gqlconfig_GqlConfigurationSubscribeParams(arg) {
  if (!(arg instanceof gql_configuration_pb.GqlConfigurationSubscribeParams)) {
    throw new Error('Expected argument of type gqlconfig.GqlConfigurationSubscribeParams');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_gqlconfig_GqlConfigurationSubscribeParams(buffer_arg) {
  return gql_configuration_pb.GqlConfigurationSubscribeParams.deserializeBinary(new Uint8Array(buffer_arg));
}


var GqlConfigurationService = exports.GqlConfigurationService = {
  subscribe: {
    path: '/gqlconfig.GqlConfiguration/Subscribe',
    requestStream: false,
    responseStream: true,
    requestType: gql_configuration_pb.GqlConfigurationSubscribeParams,
    responseType: gql_configuration_pb.GqlConfigurationMessage,
    requestSerialize: serialize_gqlconfig_GqlConfigurationSubscribeParams,
    requestDeserialize: deserialize_gqlconfig_GqlConfigurationSubscribeParams,
    responseSerialize: serialize_gqlconfig_GqlConfigurationMessage,
    responseDeserialize: deserialize_gqlconfig_GqlConfigurationMessage,
  },
};

exports.GqlConfigurationClient = grpc.makeGenericClientConstructor(GqlConfigurationService);
