import { AgogosObjectConfig } from "../../sync/object-types";

export default interface Source {
    getAgogosObjects(): Promise<{ [kind: string]: { [name: string]: AgogosObjectConfig } }>;
    putAgogosObject(name: string, definition: AgogosObjectConfig): Promise<void>;
}
