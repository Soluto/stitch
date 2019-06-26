import * as fs from "fs";
import * as util from "util";
import * as mime from "mime-types";


import { AgogosObjectConfig } from "../../../sync/object-types";
import GqlSchemaExtractor from "./gqlSchemaExtractor";

const readFileAsync = util.promisify(fs.readFile);

const extractors: { [kind: string]: (mimeType: string, content: string) => AgogosObjectConfig } = {
    gqlschemas: GqlSchemaExtractor,
};

const defaultObjectMimeTypes = {
    gqlschemas: "gql",
    gqlendpoints: "application/json",
    gqlauthproviders: "application/json",
};

export const getExtensionByKind = (kind: string): string => mime.extension(defaultObjectMimeTypes[kind]) || defaultObjectMimeTypes[kind];

export default async (kind: string, file: string): Promise<AgogosObjectConfig> => {
    const mimeType = mime.lookup(file) || "unknown";
    const content = await readFileAsync(file, "utf8");
    if (extractors.hasOwnProperty(kind)) {
        return extractors[kind](mimeType, content);
    }
    return JSON.parse(content);
};