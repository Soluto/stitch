import { ISchemaConfig } from "../../../sync/object-types";

const subExtractors = {
    ["application/json"]: content => JSON.parse(content),
    ["unknown"]: content => ({ definition: content })
};

export default (mimeType: string, content: string): ISchemaConfig =>
    subExtractors[mimeType](content);
