import fetch from "node-fetch";
import { GqlAgogosObjectConfig } from "../sync/object-types";

export default interface Source {
    getGqlObjects(): Promise<{ [kind: string]: { [name: string]: GqlAgogosObjectConfig } }>;
    putGqlObject(name: string, kind: string, definition: GqlAgogosObjectConfig): Promise<void>;
}

export function remoteSource(remoteSourceHost: String): Source {
    return {
        async getGqlObjects() {
            const res = await fetch(`${remoteSourceHost}`);
            return await res.json();
        },
        async putGqlObject(name: string, kind: string, definition: GqlAgogosObjectConfig) {
            await fetch(`${remoteSourceHost}/${kind}/${name}`, {
                method: "POST",
                body: JSON.stringify(definition),
            });
        }
    };
}
