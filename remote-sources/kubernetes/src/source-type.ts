export default interface Source {
    getGqlObjects(): Promise<{ [kind: string]: { [name: string]: string } }>;
    putGqlObject(name: string, kind: string, definition: string): Promise<void>;
}