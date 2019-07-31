import nconf = require("nconf");
import * as R from "ramda";
import ISource, { remoteSource } from "./sources";
import createFileSource from "./sources/file";

const remoteSources: { [source: string]: ISource } = R.map(
    url => remoteSource(url),
    nconf.get("REMOTESOURCE") || {}
);

// TODO: check relative and absolute paths
const BUILTIN_RESOURCES_FOLDER = "./builtin-resources";

const sources: { [source: string]: ISource } = {
    builtin: createFileSource(BUILTIN_RESOURCES_FOLDER),
    ...remoteSources
};

export default sources;

export const defaultSource = "builtin";
