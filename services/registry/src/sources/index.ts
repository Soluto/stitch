import fetch from 'node-fetch';
import logger from '../logger';
import { AgogosObjectConfig } from '../sync/object-types';

export default interface Source {
    getAgogosObjects(): Promise<{ [kind: string]: { [name: string]: AgogosObjectConfig } }>;
    putAgogosObject(name: string, kind: string, definition: AgogosObjectConfig): Promise<void>;
}

export function remoteSource(remoteSourceHost: string): Source {
  return {
    async getAgogosObjects() {
      const response = await fetch(`${remoteSourceHost}`);
      const aggObjects = await response.json();
      logger.debug(aggObjects, `Resources fetched from ${remoteSourceHost}:`);
      return aggObjects;
    },
    async putAgogosObject(name: string, kind: string, definition: AgogosObjectConfig) {
      await fetch(`${remoteSourceHost}/${kind}/${name}`, {
        body: JSON.stringify(definition),
        method: 'POST'
      });
    }
  };
}
