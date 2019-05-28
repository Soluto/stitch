// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var gql_configuration_pb = require('./gql_configuration_pb.js');

function serialize_gqlschema_GqlConfigurationMessage(arg) {
  if (!(arg instanceof gql_configuration_pb.GqlConfigurationMessage)) {
    throw new Error('Expected argument of type gqlschema.GqlConfigurationMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_gqlschema_GqlConfigurationMessage(buffer_arg) {
  return gql_configuration_pb.GqlConfigurationMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_gqlschema_GqlConfigurationSubscribeParams(arg) {
  if (!(arg instanceof gql_configuration_pb.GqlConfigurationSubscribeParams)) {
    throw new Error('Expected argument of type gqlschema.GqlConfigurationSubscribeParams');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_gqlschema_GqlConfigurationSubscribeParams(buffer_arg) {
  return gql_configuration_pb.GqlConfigurationSubscribeParams.deserializeBinary(new Uint8Array(buffer_arg));
}


var GqlConfigurationService = exports.GqlConfigurationService = {
  subscribe: {
    path: '/gqlschema.GqlConfiguration/Subscribe',
    requestStream: false,
    responseStream: true,
    requestType: gql_configuration_pb.GqlConfigurationSubscribeParams,
    responseType: gql_configuration_pb.GqlConfigurationMessage,
    requestSerialize: serialize_gqlschema_GqlConfigurationSubscribeParams,
    requestDeserialize: deserialize_gqlschema_GqlConfigurationSubscribeParams,
    responseSerialize: serialize_gqlschema_GqlConfigurationMessage,
    responseDeserialize: deserialize_gqlschema_GqlConfigurationMessage,
  },
};

exports.GqlConfigurationClient = grpc.makeGenericClientConstructor(GqlConfigurationService);
