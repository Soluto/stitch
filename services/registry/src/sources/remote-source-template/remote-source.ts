import Source from "..";

const remoteSource: Source = {
    async getGqlObjects(): Promise<{ [kind: string]: { [name: string]: string } }> {
        throw "Not implemented";
    },

    async putGqlObject(name: string, kind: string, definition: string): Promise<void> {
        throw "Not implemented";
    }
};

export default remoteSource;
