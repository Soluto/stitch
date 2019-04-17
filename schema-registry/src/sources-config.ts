import file from "./sources/file";
import { remoteSource } from "./sources";
import Source from "./sources";
import * as R from "ramda";
import nconf = require("nconf");

const remoteSources: { [source: string]: string } = R.map(
  url => remoteSource(url),
  nconf.get("REMOTESOURCE") || {}
) as any;

const sources: { [source: string]: Source } = {
  file,
  ...remoteSources
};

export default sources;

export const defaultSource = "file";
