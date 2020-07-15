// @ts-ignore TODO: remove when type definitions will be included in opa-wasm package
import * as Rego from '@open-policy-agent/opa-wasm';
import { getCompiledFilename } from '../../opa-helper';
import { PolicyArgsObject } from '../../resource-repository';
import { PolicyEvaluationContext, PolicyEvaluationResult, QueryResults } from './types';

export async function evaluate(ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
  const policy = await getWasmPolicy(ctx);
  const input = getInput(ctx);

  const result = policy.evaluate(input)?.[0]?.result;

  return { done: true, allow: result?.allow };
}

// TODO: remove "any" when type definitions will be included in opa-wasm package
async function getWasmPolicy(ctx: PolicyEvaluationContext): Promise<any> {
  const filename = getCompiledFilename({ namespace: ctx.namespace, name: ctx.name });
  const wasm = ctx.policyAttachments[filename];

  const rego = new Rego();
  return rego.load_policy(wasm);
}

function getInput(ctx: PolicyEvaluationContext): PolicyOpaInput {
  const input: PolicyOpaInput = {};

  if (ctx.args) input.args = ctx.args;
  if (ctx.query) input.query = ctx.query;

  return input;
}

type PolicyOpaInput = {
  args?: PolicyArgsObject;
  query?: QueryResults;
};
