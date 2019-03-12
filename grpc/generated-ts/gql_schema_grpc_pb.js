// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var gql_schema_pb = require('./gql_schema_pb.js');

function serialize_gqlschema_GqlSchemaMessage(arg) {
  if (!(arg instanceof gql_schema_pb.GqlSchemaMessage)) {
    throw new Error('Expected argument of type gqlschema.GqlSchemaMessage');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_gqlschema_GqlSchemaMessage(buffer_arg) {
  return gql_schema_pb.GqlSchemaMessage.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_gqlschema_GqlSchemaSubscribeParams(arg) {
  if (!(arg instanceof gql_schema_pb.GqlSchemaSubscribeParams)) {
    throw new Error('Expected argument of type gqlschema.GqlSchemaSubscribeParams');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_gqlschema_GqlSchemaSubscribeParams(buffer_arg) {
  return gql_schema_pb.GqlSchemaSubscribeParams.deserializeBinary(new Uint8Array(buffer_arg));
}


var GqlSchemaService = exports.GqlSchemaService = {
  subscribe: {
    path: '/gqlschema.GqlSchema/Subscribe',
    requestStream: false,
    responseStream: true,
    requestType: gql_schema_pb.GqlSchemaSubscribeParams,
    responseType: gql_schema_pb.GqlSchemaMessage,
    requestSerialize: serialize_gqlschema_GqlSchemaSubscribeParams,
    requestDeserialize: deserialize_gqlschema_GqlSchemaSubscribeParams,
    responseSerialize: serialize_gqlschema_GqlSchemaMessage,
    responseDeserialize: deserialize_gqlschema_GqlSchemaMessage,
  },
};

exports.GqlSchemaClient = grpc.makeGenericClientConstructor(GqlSchemaService);
