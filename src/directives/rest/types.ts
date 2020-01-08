export enum ContentType {
    JSON = 'json',
}

export interface KeyValue {
    key: string;
    value: string;
}

export interface RestParams {
    url: string;
    method?: string;
    contentType?: ContentType;
    bodyArg?: string;
    query?: KeyValue[];
    headers?: KeyValue[];
    timeoutMs?: number;
}
