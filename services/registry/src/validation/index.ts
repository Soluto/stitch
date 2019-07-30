import { AgogosConfiguration, AgogosObjectConfig } from "../sync/object-types";
import validateSchema from "./validators/schemaValidator";
import validateUpstream from "./validators/upstreamValidator";
import validateUpstreamClientCredentials from "./validators/upstreamClientCredentialsValidator";

type ValidatorFunc = (source: string, name: string, spec: AgogosObjectConfig) => Promise<void>

type ValidatorDictionary = {
    [kind: string]: ValidatorFunc;
}

const validators: ValidatorDictionary = {
    schema: validateSchema,
    upstream: validateUpstream,
    upstreamclientcredentials: validateUpstreamClientCredentials,
};


export const validateNewObject = async (name: string, kind: string, source: string, spec: AgogosObjectConfig): Promise<void> => {
    if (!validators.hasOwnProperty(kind)) {
        throw new Error("Unknown GraphQL object kind");
    }
    await validators[kind].call(null, source, name, spec);
};

export const validateConfiguration = async (configuration: AgogosConfiguration): Promise<boolean> => {
    return true;
};