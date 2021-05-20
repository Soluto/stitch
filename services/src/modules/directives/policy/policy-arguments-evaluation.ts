import { parseType } from 'graphql';
import { inject } from '../../arguments-injection';
import { createChildLogger } from '../../logger';
import { PolicyArgsObject } from '../../resource-repository';
import PolicyExecutionFailedError from './policy-execution-failed-error';
import { PolicyDirectiveExecutionContext } from './types';

export default function preparePolicyArgs(ctx: PolicyDirectiveExecutionContext): PolicyArgsObject | undefined {
  const pArgLogger = createChildLogger(ctx.logger, 'policy-argument-evaluator');
  pArgLogger.trace('Preparing policy arguments...');
  const supportedPolicyArgs = ctx.policyDefinition.args;
  if (!supportedPolicyArgs) return;

  const policyArgs = Object.entries(supportedPolicyArgs).reduce<PolicyArgsObject>(
    (policyArgs, [policyArgName, { default: defaultArg, type, optional = false }]) => {
      pArgLogger.trace(`Evaluating policy argument "${policyArgName}"...`);
      const isPolicyArgProvided =
        ctx.policy.args && Object.prototype.hasOwnProperty.call(ctx.policy.args, policyArgName);

      let policyArgValue = isPolicyArgProvided ? ctx.policy.args?.[policyArgName] : defaultArg;

      if (policyArgValue === undefined) {
        if (!optional) {
          pArgLogger.error({ policyArgName }, `Missing argument "${policyArgName}"`);
          throw new PolicyExecutionFailedError(
            ctx.policyDefinition.metadata,
            `Missing argument "${policyArgName}"`,
            ctx.info.parentType.name,
            ctx.info.fieldName
          );
        }

        policyArgValue = null;
      }

      if (typeof policyArgValue === 'string') {
        const { source, gqlArgs: args, requestContext: context, info, result } = ctx;
        policyArgValue = inject(policyArgValue, { source, args, context, info, result });
      }

      policyArgs[policyArgName] = policyArgValue;
      pArgLogger.trace(
        {
          policyArgExp: ctx.policy.args?.[policyArgName] ?? defaultArg,
          policyArgValue: policyArgValue,
        },
        `Policy argument "${policyArgName}" evaluated to "${policyArgValue}"`
      );

      const typeAST = parseType(type);
      if (typeAST.kind === 'NonNullType' && (typeof policyArgValue === 'undefined' || policyArgValue === null)) {
        const errorMessage = `Non-nullable argument "${policyArgName}" got value "${policyArgValue}"`;
        pArgLogger.error({ policyArgName }, errorMessage);
        throw new PolicyExecutionFailedError(
          ctx.policyDefinition.metadata,
          errorMessage,
          ctx.info.parentType.name,
          ctx.info.fieldName
        );
      }

      return policyArgs;
    },
    {}
  );
  pArgLogger.trace({ policyArgs }, 'Policy arguments calculated');
  return policyArgs;
}
