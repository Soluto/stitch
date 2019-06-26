import Source from "..";
import { AgogosObjectConfig } from "../../sync/object-types";

const remoteSource: Source = {
    async getAgogosObjects(): Promise<{ [kind: string]: { [name: string]: AgogosObjectConfig } }> {
        throw "Not implemented";
    },

    async putAgogosObject(name: string, kind: string, definition: AgogosObjectConfig): Promise<void> {
        throw "Not implemented";
    }
};

export default remoteSource;
