import {PolicyArgsObject, PolicyAttachments} from '../../resource-repository/types';

export type Policy = {
    namespace: string;
    name: string;
    args?: PolicyArgsObject;
};

// args here contain the final values after param injection
export type PolicyExecutionContext = {
    namespace: string;
    name: string;
    policyAttachments: PolicyAttachments;
    args?: PolicyArgsObject;
    query?: QueryResults;
};

export type QueryResults = {
    [name: string]: any;
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
