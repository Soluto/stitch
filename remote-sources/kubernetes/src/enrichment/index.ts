import authProviderEnricher from "./authProviderEnricher";
import { AgogosObjectConfig } from "../object-types";

const enrichers: { [kind: string]: (obj: AgogosObjectConfig) => Promise<AgogosObjectConfig> } = {
    gqlauthproviders: authProviderEnricher,
};

export default async (kind: string, definition: AgogosObjectConfig): Promise<AgogosObjectConfig> => {
    if (enrichers.hasOwnProperty(kind)) {
        return enrichers[kind](definition);
    }
    return definition;
};