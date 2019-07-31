import { AgogosObjectConfig } from "./object-types";

export default interface ISource {
    getAgogosObjects(): Promise<{ [kind: string]: { [name: string]: AgogosObjectConfig } }>;
    putAgogosObject(name: string, kind: string, definition: AgogosObjectConfig): Promise<void>;
}