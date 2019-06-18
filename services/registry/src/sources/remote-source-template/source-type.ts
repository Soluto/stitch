import { GqlAgogosObjectConfig } from "../../sync/object-types";

export default interface Source {
    getGqlObjects(): Promise<{ [kind: string]: { [name: string]: GqlAgogosObjectConfig } }>;
    putGqlObject(name: string, definition: GqlAgogosObjectConfig): Promise<void>;
}
