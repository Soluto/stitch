import { SchemaConfig } from "../../../sync/object-types";

const subExtractors = {
    ["application/json"]: content => JSON.parse(content),
    ["unknown"]: content => ({ definition: content })
};

export default (mimeType: string, content: string): SchemaConfig =>
    subExtractors[mimeType](content);
