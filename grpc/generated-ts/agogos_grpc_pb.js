// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var agogos_pb = require('./agogos_pb.js');

function serialize_gqlconfig_ConfigurationMessage(arg) {
  if (!(arg instanceof agogos_pb.ConfigurationMessage)) {
    throw new Error('Expected argument of type gqlconfig.ConfigurationMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_gqlconfig_ConfigurationMessage(buffer_arg) {
  return agogos_pb.ConfigurationMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_gqlconfig_SubscribeParams(arg) {
  if (!(arg instanceof agogos_pb.SubscribeParams)) {
    throw new Error('Expected argument of type gqlconfig.SubscribeParams');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_gqlconfig_SubscribeParams(buffer_arg) {
  return agogos_pb.SubscribeParams.deserializeBinary(new Uint8Array(buffer_arg));
}


var RegistryService = exports.RegistryService = {
  subscribe: {
    path: '/gqlconfig.Registry/Subscribe',
    requestStream: false,
    responseStream: true,
    requestType: agogos_pb.SubscribeParams,
    responseType: agogos_pb.ConfigurationMessage,
    requestSerialize: serialize_gqlconfig_SubscribeParams,
    requestDeserialize: deserialize_gqlconfig_SubscribeParams,
    responseSerialize: serialize_gqlconfig_ConfigurationMessage,
    responseDeserialize: deserialize_gqlconfig_ConfigurationMessage,
  },
};

exports.RegistryClient = grpc.makeGenericClientConstructor(RegistryService);
