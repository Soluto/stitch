import { GqlAgogosObjectConfig } from "../../../sync/object-types";
import GqlSchemaExtractor from "./gqlSchemaExtractor";

export default (kind: string, content: string): GqlAgogosObjectConfig => {
    if (extractors.hasOwnProperty(kind)) {
        return extractors[kind](content);
    }
    return JSON.parse(content);
};

const extractors: { [kind: string]: (content: string) => GqlAgogosObjectConfig } = {
    gqlschemas: GqlSchemaExtractor,
};