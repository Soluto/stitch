import {PolicyArgsObject, ResourceRepository} from '../../resource-repository/types';

export type Policy = {
    namespace: string;
    name: string;
    args?: PolicyArgsObject;
};

// args here contain the final values after param injection
export type PolicyExecutionContext = {
    namespace: string;
    name: string;
    repo: ResourceRepository;
    jwt?: JwtInput;
    args?: PolicyArgsObject;
    queries?: QueriesResults;
};

export type QueriesResults = {
    [name: string]: string;
};

export type JwtInput = {
    [name: string]: string;
};

export type PolicyExecutionResult = {
    done: boolean;
    allow?: boolean;
    query?: {
        type: string;
        code: string;
    };
};

export type GraphQLArguments = {
    [name: string]: any;
};
