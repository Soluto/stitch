import { GqlAgogosObjectConfig } from "./object-types";

export default interface Source {
    getGqlObjects(): Promise<{ [kind: string]: { [name: string]: GqlAgogosObjectConfig } }>;
    putGqlObject(name: string, kind: string, definition: GqlAgogosObjectConfig): Promise<void>;
}