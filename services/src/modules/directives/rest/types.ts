export interface KeyValue {
  key: string;
  value: string;
}

export interface RestParams {
  url: string;
  method?: string;
  bodyArg?: string;
  query?: KeyValue[];
  headers?: KeyValue[];
  timeoutMs?: number;
}
