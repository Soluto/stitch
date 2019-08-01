import fetch from "node-fetch";
import { AgogosObjectConfig } from "../sync/object-types";

export default interface Source {
    getAgogosObjects(): Promise<{ [kind: string]: { [name: string]: AgogosObjectConfig } }>;
    putAgogosObject(name: string, kind: string, definition: AgogosObjectConfig): Promise<void>;
}

export function remoteSource(remoteSourceHost: string): Source {
    return {
        async getAgogosObjects() {
            const res = await fetch(`${remoteSourceHost}`);
            return res.json();
        },
        async putAgogosObject(name: string, kind: string, definition: AgogosObjectConfig) {
            await fetch(`${remoteSourceHost}/${kind}/${name}`, {
                body: JSON.stringify(definition),
                method: "POST",
            });
        }
    };
}
