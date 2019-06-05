export default interface Source {
    getGqlObjects(): Promise<{ [kind: string]: { [name: string]: string } }>;
    putGqlObject(name: string, schema: string): Promise<void>;
}
