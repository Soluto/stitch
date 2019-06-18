import Source from "..";
import { GqlAgogosObjectConfig } from "../../sync/object-types";

const remoteSource: Source = {
    async getGqlObjects(): Promise<{ [kind: string]: { [name: string]: GqlAgogosObjectConfig } }> {
        throw "Not implemented";
    },

    async putGqlObject(name: string, kind: string, definition: GqlAgogosObjectConfig): Promise<void> {
        throw "Not implemented";
    }
};

export default remoteSource;
