import {DocumentNode, parse} from 'graphql';

export interface ResourceGroup {
    schemas: {[name: string]: DocumentNode};
}

const personServiceSdl = `
type Person @key(fields: "id") {
    id: ID! @stub(value: "123")
    name: String! @stub(value: "geralt")
}
type Query {
    person: Person! @stub(value: "stub")
}`;

const originServiceSdl = `
extend type Person @key(fields: "id") {
    id: ID! @external
    origin: String! @stub(value: "rivia")
}`;

export async function fetch(): Promise<ResourceGroup> {
    return {
        schemas: {
            personService: parse(personServiceSdl),
            originService: parse(originServiceSdl),
        },
    };
}
