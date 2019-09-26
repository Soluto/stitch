import * as R from 'ramda';
import Source, { remoteSource } from './sources';
import createFileSource from './sources/file';
import nconf = require('nconf');

const remoteSources: { [source: string]: Source } = R.map(
  url => remoteSource(url),
  nconf.get('REMOTESOURCE') || {}
);

// TODO: check relative and absolute paths
const BUILTIN_RESOURCES_FOLDER = './builtin-resources';

const sources: { [source: string]: Source } = {
  builtin: createFileSource(BUILTIN_RESOURCES_FOLDER),
  ...remoteSources
};

export default sources;

export const defaultSource = 'builtin';
