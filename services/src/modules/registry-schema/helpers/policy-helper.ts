import { parseType } from 'graphql';
import { PolicyInput } from '..';
import logger, { createChildLogger } from '../../logger';
import { PolicyArgDefinition } from '../../resource-repository';

export function markOptionalPolicyArgs(policies?: PolicyInput[]) {
  policies?.forEach(p => {
    if (!p.args) return;

    const pLogger = createChildLogger(logger, 'policy-argument-helper', { policy: p.metadata });

    Object.entries(p.args).forEach(([argName, argDef]: [string, PolicyArgDefinition]) => {
      try {
        const type = parseType(argDef.type);
        argDef.optional = type.kind !== 'NonNullType' || !!argDef.default;
        pLogger.debug(
          { argName, argDef },
          `Policy argument ${argName} ${argDef.optional ? 'was' : "wasn't"} marked as optional`
        );
      } catch (err) {
        pLogger.warn({ argName, argDef, err }, 'Invalid policy argument');
        throw err;
      }
    });
  });
}
