// package: gqlschema
// file: gql_configuration.proto

/* tslint:disable */

import * as jspb from "google-protobuf";

export class GqlConfigurationSubscribeParams extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GqlConfigurationSubscribeParams.AsObject;
    static toObject(includeInstance: boolean, msg: GqlConfigurationSubscribeParams): GqlConfigurationSubscribeParams.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GqlConfigurationSubscribeParams, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GqlConfigurationSubscribeParams;
    static deserializeBinaryFromReader(message: GqlConfigurationSubscribeParams, reader: jspb.BinaryReader): GqlConfigurationSubscribeParams;
}

export namespace GqlConfigurationSubscribeParams {
    export type AsObject = {
    }
}

export class GqlConfigurationMessage extends jspb.Message { 

    hasSchema(): boolean;
    clearSchema(): void;
    getSchema(): GqlSchema | undefined;
    setSchema(value?: GqlSchema): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GqlConfigurationMessage.AsObject;
    static toObject(includeInstance: boolean, msg: GqlConfigurationMessage): GqlConfigurationMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GqlConfigurationMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GqlConfigurationMessage;
    static deserializeBinaryFromReader(message: GqlConfigurationMessage, reader: jspb.BinaryReader): GqlConfigurationMessage;
}

export namespace GqlConfigurationMessage {
    export type AsObject = {
        schema?: GqlSchema.AsObject,
    }
}

export class GqlSchema extends jspb.Message { 
    getGql(): string;
    setGql(value: string): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GqlSchema.AsObject;
    static toObject(includeInstance: boolean, msg: GqlSchema): GqlSchema.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GqlSchema, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GqlSchema;
    static deserializeBinaryFromReader(message: GqlSchema, reader: jspb.BinaryReader): GqlSchema;
}

export namespace GqlSchema {
    export type AsObject = {
        gql: string,
    }
}
