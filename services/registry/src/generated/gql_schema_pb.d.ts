// package: gqlschema
// file: gql_schema.proto

/* tslint:disable */

import * as jspb from "google-protobuf";

export class GqlSchemaSubscribeParams extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GqlSchemaSubscribeParams.AsObject;
    static toObject(includeInstance: boolean, msg: GqlSchemaSubscribeParams): GqlSchemaSubscribeParams.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GqlSchemaSubscribeParams, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GqlSchemaSubscribeParams;
    static deserializeBinaryFromReader(message: GqlSchemaSubscribeParams, reader: jspb.BinaryReader): GqlSchemaSubscribeParams;
}

export namespace GqlSchemaSubscribeParams {
    export type AsObject = {
    }
}

export class GqlSchemaMessage extends jspb.Message { 
    getSchema(): string;
    setSchema(value: string): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GqlSchemaMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GqlSchemaMessage): GqlSchemaMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GqlSchemaMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GqlSchemaMessage;
    static deserializeBinaryFromReader(message: GqlSchemaMessage, reader: jspb.BinaryReader): GqlSchemaMessage;
}

export namespace GqlSchemaMessage {
    export type AsObject = {
        schema: string,
    }
}
