// package: gqlconfig
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

    clearEndpointsList(): void;
    getEndpointsList(): Array<GqlEndpoint>;
    setEndpointsList(value: Array<GqlEndpoint>): void;
    addEndpoints(value?: GqlEndpoint, index?: number): GqlEndpoint;

    clearAuthprovidersList(): void;
    getAuthprovidersList(): Array<GqlAuthProvider>;
    setAuthprovidersList(value: Array<GqlAuthProvider>): void;
    addAuthproviders(value?: GqlAuthProvider, index?: number): GqlAuthProvider;


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
        endpointsList: Array<GqlEndpoint.AsObject>,
        authprovidersList: Array<GqlAuthProvider.AsObject>,
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

export class GqlEndpoint extends jspb.Message { 
    getHost(): string;
    setHost(value: string): void;


    hasAuth(): boolean;
    clearAuth(): void;
    getAuth(): GqlEndpointAuthentication | undefined;
    setAuth(value?: GqlEndpointAuthentication): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GqlEndpoint.AsObject;
    static toObject(includeInstance: boolean, msg: GqlEndpoint): GqlEndpoint.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GqlEndpoint, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GqlEndpoint;
    static deserializeBinaryFromReader(message: GqlEndpoint, reader: jspb.BinaryReader): GqlEndpoint;
}

export namespace GqlEndpoint {
    export type AsObject = {
        host: string,
        auth?: GqlEndpointAuthentication.AsObject,
    }
}

export class GqlEndpointAuthentication extends jspb.Message { 
    getType(): AuthenticationType;
    setType(value: AuthenticationType): void;

    getAuthority(): string;
    setAuthority(value: string): void;

    getScope(): string;
    setScope(value: string): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GqlEndpointAuthentication.AsObject;
    static toObject(includeInstance: boolean, msg: GqlEndpointAuthentication): GqlEndpointAuthentication.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GqlEndpointAuthentication, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GqlEndpointAuthentication;
    static deserializeBinaryFromReader(message: GqlEndpointAuthentication, reader: jspb.BinaryReader): GqlEndpointAuthentication;
}

export namespace GqlEndpointAuthentication {
    export type AsObject = {
        type: AuthenticationType,
        authority: string,
        scope: string,
    }
}

export class GqlAuthProvider extends jspb.Message { 
    getType(): AuthenticationType;
    setType(value: AuthenticationType): void;

    getAuthority(): string;
    setAuthority(value: string): void;

    getClientid(): string;
    setClientid(value: string): void;

    getClientsecret(): string;
    setClientsecret(value: string): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GqlAuthProvider.AsObject;
    static toObject(includeInstance: boolean, msg: GqlAuthProvider): GqlAuthProvider.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GqlAuthProvider, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GqlAuthProvider;
    static deserializeBinaryFromReader(message: GqlAuthProvider, reader: jspb.BinaryReader): GqlAuthProvider;
}

export namespace GqlAuthProvider {
    export type AsObject = {
        type: AuthenticationType,
        authority: string,
        clientid: string,
        clientsecret: string,
    }
}

export enum AuthenticationType {
    CLIENT_CREDENTIALS = 0,
}
