import { AgogosObjectConfig } from "../sync/object-types";
import {validateSchemaWithLatest} from "./validators/schemaValidator";
import validateUpstreamClientCredentials from "./validators/upstreamClientCredentialsValidator";
import validateUpstream from "./validators/upstreamValidator";

type ValidatorFunc = (source: string, name: string, spec: AgogosObjectConfig) => Promise<void>

type ValidatorDictionary = {
    [kind: string]: ValidatorFunc;
}

const validators: ValidatorDictionary = {
    schema: validateSchemaWithLatest,
    upstream: validateUpstream,
    upstreamclientcredentials: validateUpstreamClientCredentials,
};


export const validateNewObject = async (name: string, kind: string, source: string, spec: AgogosObjectConfig): Promise<void> => {
    if (!validators.hasOwnProperty(kind)) {
        throw new Error("Unknown GraphQL object kind");
    }
    await validators[kind](source, name, spec);
};
