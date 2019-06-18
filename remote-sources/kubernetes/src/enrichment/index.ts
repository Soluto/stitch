import authProviderEnricher from "./authProviderEnricher";
import { GqlAgogosObjectConfig } from "../object-types";

const enrichers: { [kind: string]: (obj: GqlAgogosObjectConfig) => Promise<GqlAgogosObjectConfig> } = {
    gqlauthproviders: authProviderEnricher,
};

export default async (kind: string, definition: GqlAgogosObjectConfig): Promise<GqlAgogosObjectConfig> => {
    if (enrichers.hasOwnProperty(kind)) {
        return enrichers[kind](definition);
    }
    return definition;
};