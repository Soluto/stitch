// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var agogos_pb = require('./agogos_pb.js');

function serialize_agogos_ConfigurationMessage(arg) {
  if (!(arg instanceof agogos_pb.ConfigurationMessage)) {
    throw new Error('Expected argument of type agogos.ConfigurationMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agogos_ConfigurationMessage(buffer_arg) {
  return agogos_pb.ConfigurationMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_agogos_SubscribeParams(arg) {
  if (!(arg instanceof agogos_pb.SubscribeParams)) {
    throw new Error('Expected argument of type agogos.SubscribeParams');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_agogos_SubscribeParams(buffer_arg) {
  return agogos_pb.SubscribeParams.deserializeBinary(new Uint8Array(buffer_arg));
}


var RegistryService = exports.RegistryService = {
  subscribe: {
    path: '/agogos.Registry/Subscribe',
    requestStream: false,
    responseStream: true,
    requestType: agogos_pb.SubscribeParams,
    responseType: agogos_pb.ConfigurationMessage,
    requestSerialize: serialize_agogos_SubscribeParams,
    requestDeserialize: deserialize_agogos_SubscribeParams,
    responseSerialize: serialize_agogos_ConfigurationMessage,
    responseDeserialize: deserialize_agogos_ConfigurationMessage,
  },
};

exports.RegistryClient = grpc.makeGenericClientConstructor(RegistryService);
