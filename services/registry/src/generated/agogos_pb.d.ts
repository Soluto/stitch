// package: agogos
// file: agogos.proto

/* tslint:disable */

import * as jspb from "google-protobuf";

export class SubscribeParams extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SubscribeParams.AsObject;
    static toObject(includeInstance: boolean, msg: SubscribeParams): SubscribeParams.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SubscribeParams, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SubscribeParams;
    static deserializeBinaryFromReader(message: SubscribeParams, reader: jspb.BinaryReader): SubscribeParams;
}

export namespace SubscribeParams {
    export type AsObject = {
    }
}

export class ConfigurationMessage extends jspb.Message { 

    hasSchema(): boolean;
    clearSchema(): void;
    getSchema(): Schema | undefined;
    setSchema(value?: Schema): void;

    clearUpstreamsList(): void;
    getUpstreamsList(): Array<Upstream>;
    setUpstreamsList(value: Array<Upstream>): void;
    addUpstreams(value?: Upstream, index?: number): Upstream;

    clearUpstreamAuthCredentialsList(): void;
    getUpstreamAuthCredentialsList(): Array<UpstreamAuthCredentials>;
    setUpstreamAuthCredentialsList(value: Array<UpstreamAuthCredentials>): void;
    addUpstreamAuthCredentials(value?: UpstreamAuthCredentials, index?: number): UpstreamAuthCredentials;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ConfigurationMessage.AsObject;
    static toObject(includeInstance: boolean, msg: ConfigurationMessage): ConfigurationMessage.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ConfigurationMessage, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ConfigurationMessage;
    static deserializeBinaryFromReader(message: ConfigurationMessage, reader: jspb.BinaryReader): ConfigurationMessage;
}

export namespace ConfigurationMessage {
    export type AsObject = {
        schema?: Schema.AsObject,
        upstreamsList: Array<Upstream.AsObject>,
        upstreamAuthCredentialsList: Array<UpstreamAuthCredentials.AsObject>,
    }
}

export class Schema extends jspb.Message { 
    getDefinition(): string;
    setDefinition(value: string): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Schema.AsObject;
    static toObject(includeInstance: boolean, msg: Schema): Schema.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Schema, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Schema;
    static deserializeBinaryFromReader(message: Schema, reader: jspb.BinaryReader): Schema;
}

export namespace Schema {
    export type AsObject = {
        definition: string,
    }
}

export class Upstream extends jspb.Message { 
    getHost(): string;
    setHost(value: string): void;


    hasAuth(): boolean;
    clearAuth(): void;
    getAuth(): UpstreamAuthentication | undefined;
    setAuth(value?: UpstreamAuthentication): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Upstream.AsObject;
    static toObject(includeInstance: boolean, msg: Upstream): Upstream.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Upstream, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Upstream;
    static deserializeBinaryFromReader(message: Upstream, reader: jspb.BinaryReader): Upstream;
}

export namespace Upstream {
    export type AsObject = {
        host: string,
        auth?: UpstreamAuthentication.AsObject,
    }
}

export class UpstreamAuthentication extends jspb.Message { 
    getAuthType(): string;
    setAuthType(value: string): void;

    getAuthority(): string;
    setAuthority(value: string): void;

    getScope(): string;
    setScope(value: string): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): UpstreamAuthentication.AsObject;
    static toObject(includeInstance: boolean, msg: UpstreamAuthentication): UpstreamAuthentication.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: UpstreamAuthentication, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): UpstreamAuthentication;
    static deserializeBinaryFromReader(message: UpstreamAuthentication, reader: jspb.BinaryReader): UpstreamAuthentication;
}

export namespace UpstreamAuthentication {
    export type AsObject = {
        authType: string,
        authority: string,
        scope: string,
    }
}

export class UpstreamAuthCredentials extends jspb.Message { 
    getAuthType(): string;
    setAuthType(value: string): void;

    getAuthority(): string;
    setAuthority(value: string): void;

    getClientId(): string;
    setClientId(value: string): void;

    getClientSecret(): string;
    setClientSecret(value: string): void;


    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): UpstreamAuthCredentials.AsObject;
    static toObject(includeInstance: boolean, msg: UpstreamAuthCredentials): UpstreamAuthCredentials.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: UpstreamAuthCredentials, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): UpstreamAuthCredentials;
    static deserializeBinaryFromReader(message: UpstreamAuthCredentials, reader: jspb.BinaryReader): UpstreamAuthCredentials;
}

export namespace UpstreamAuthCredentials {
    export type AsObject = {
        authType: string,
        authority: string,
        clientId: string,
        clientSecret: string,
    }
}
