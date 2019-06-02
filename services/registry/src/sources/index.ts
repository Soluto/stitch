import fetch from "node-fetch";

export default interface Source {
    getGqlObjects(kind: string): Promise<{ [name: string]: string }>;
    putGqlObject(name: string, kind: string, definition: string): Promise<void>;
}

export function remoteSource(remoteSourceHost: String): Source {
    return {
        async getGqlObjects(kind: string) {
            const res = await fetch(`${remoteSourceHost}/${kind}`);
            return await res.json();
        },
        async putGqlObject(name: string, kind: string, definition: string) {
            await fetch(`${remoteSourceHost}/${kind}/${name}`, {
                method: "POST",
                body: definition,
            });
        }
    };
}
