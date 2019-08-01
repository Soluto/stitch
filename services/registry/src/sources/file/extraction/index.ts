import * as fs from "fs";
import * as mime from "mime-types";
import * as util from "util";

import { AgogosObjectConfig } from "../../../sync/object-types";
import SchemaExtractor from "./schemaExtractor";

const readFileAsync = util.promisify(fs.readFile);

const extractors: {
    [kind: string]: (mimeType: string, content: string) => AgogosObjectConfig;
} = {
    schemas: SchemaExtractor
};

const defaultObjectMimeTypes = {
    schemas: "gql",
    upstreams: "application/json",
    upstreamsClientCredentials: "application/json"
};

export const getExtensionByKind = (kind: string): string =>
    mime.extension(defaultObjectMimeTypes[kind]) || defaultObjectMimeTypes[kind];

export default async (
    kind: string,
    file: string
): Promise<AgogosObjectConfig> => {
    const mimeType = mime.lookup(file) || "unknown";
    const content = await readFileAsync(file, "utf8");
    if (extractors.hasOwnProperty(kind)) {
        return extractors[kind](mimeType, content);
    }
    return JSON.parse(content);
};
