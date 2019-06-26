import fetch from "node-fetch";
import { AgogosObjectConfig } from "../sync/object-types";

export default interface Source {
    getAgogosObjects(): Promise<{ [kind: string]: { [name: string]: AgogosObjectConfig } }>;
    putAgogosObject(name: string, kind: string, definition: AgogosObjectConfig): Promise<void>;
}

export function remoteSource(remoteSourceHost: String): Source {
    return {
        async getAgogosObjects() {
            const res = await fetch(`${remoteSourceHost}`);
            return await res.json();
        },
        async putAgogosObject(name: string, kind: string, definition: AgogosObjectConfig) {
            await fetch(`${remoteSourceHost}/${kind}/${name}`, {
                method: "POST",
                body: JSON.stringify(definition),
            });
        }
    };
}
