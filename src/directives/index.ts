import {gql} from 'apollo-server-core';
import {SchemaDirectiveVisitor} from 'graphql-tools';
import {sdl as stubSdl, StubDirective} from './stub';
import {sdl as restSdl, RestDirective} from './rest';
import {sdl as gqlSdl, GqlDirective} from './gql';

export const directiveMap: {[visitorName: string]: typeof SchemaDirectiveVisitor} = {
    stub: StubDirective,
    rest: RestDirective,
    gql: GqlDirective,
};

export const sdl = gql`
    ${stubSdl}
    ${restSdl}
    ${gqlSdl}
`;
