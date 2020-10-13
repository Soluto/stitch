// @ts-ignore TODO: remove when type definitions will be included in opa-wasm package
import * as Rego from '@open-policy-agent/opa-wasm';
import logger from '../../logger';
import { getCompiledFilename } from '../../opa-helper';
import { PolicyArgsObject } from '../../resource-repository';
import { PolicyEvaluationContext, PolicyEvaluationResult, LoadedPolicy, QueryResults } from './types';

export function evaluate(ctx: PolicyEvaluationContext): PolicyEvaluationResult {
  const filename = getCompiledFilename({ namespace: ctx.namespace, name: ctx.name });
  const policy = ctx.policyAttachments[filename];
  if (!policy) {
    logger.error({ policy: filename }, 'Policy attachment not found.');
    throw new Error(`Policy WASM ${filename} not found`);
  }
  const input = getInput(ctx);
  const result = policy.evaluate(input)?.[0]?.result;

  return { done: true, allow: result?.allow };
}

// TODO: change "LoadedPolicy" type when type definitions will be included in opa-wasm package
export async function getWasmPolicy(wasm: Buffer): Promise<LoadedPolicy> {
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
