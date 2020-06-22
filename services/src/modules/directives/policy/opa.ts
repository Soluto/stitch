// @ts-ignore opa-wasm already has TS typings merged, but not yet published on npm
import * as Rego from '@open-policy-agent/opa-wasm';
import {getCompiledFilename} from '../../opaHelper';
import {PolicyExecutionContext, PolicyExecutionResult, QueriesResults, JwtInput} from './types';
import {PolicyArgsObject} from '../../resource-repository';

export async function evaluate(ctx: PolicyExecutionContext): Promise<PolicyExecutionResult> {
    const policy = await getWasmPolicy(ctx);
    const input = getInput(ctx);

    const result = policy.evaluate(input)?.[0]?.result;

    return {done: true, allow: result?.allow};
}

async function getWasmPolicy(ctx: PolicyExecutionContext): Promise<any> {
    const filename = getCompiledFilename({namespace: ctx.namespace, name: ctx.name});
    const wasm = ctx.policyAttachments[filename];

    const rego = new Rego();
    return rego.load_policy(wasm);
}

function getInput(ctx: PolicyExecutionContext): PolicyInput {
    const input: PolicyInput = {};

    if (ctx.jwt) input.jwt = ctx.jwt;
    if (ctx.args) input.args = ctx.args;
    if (ctx.queries) input.queries = ctx.queries;

    return input;
}

type PolicyInput = {
    jwt?: JwtInput;
    args?: PolicyArgsObject;
    queries?: QueriesResults;
};
