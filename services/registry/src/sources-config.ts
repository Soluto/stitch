import createFileSource from "./sources/file";
import { remoteSource } from "./sources";
import Source from "./sources";
import * as R from "ramda";
import nconf = require("nconf");

const remoteSources: { [source: string]: string } = R.map(
    url => remoteSource(url),
    nconf.get("REMOTESOURCE") || {}
) as any;

// TODO: check relative and absolute paths
const BUILTIN_RESOURCES_FOLDER = "../../../../builtin-resources";

const sources: { [source: string]: Source } = {
    builtin: createFileSource(BUILTIN_RESOURCES_FOLDER),
    ...remoteSources
};

export default sources;

export const defaultSource = "builtin";
