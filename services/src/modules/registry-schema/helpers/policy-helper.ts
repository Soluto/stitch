import { parseType } from 'graphql';
import { PolicyInput } from '..';
import logger from '../../logger';
import { PolicyArgDefinition } from '../../resource-repository';

export function markOptionalPolicyArgs(policies?: PolicyInput[]) {
  policies?.forEach(p => {
    if (!p.args) return;

    Object.entries(p.args).forEach(([argName, argDef]: [string, PolicyArgDefinition]) => {
      try {
        const type = parseType(argDef.type);
        argDef.optional = type.kind !== 'NonNullType' || !!argDef.default;
      } catch (err) {
        logger.warn({ policy: p.metadata, argName, argDef, err }, 'Invalid policy argument');
        throw err;
      }
    });
  });
}
