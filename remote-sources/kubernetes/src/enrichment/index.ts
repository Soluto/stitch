import authProviderEnricher from "./authProviderEnricher";

const enrichers: { [kind: string]: (obj: any) => Promise<any> } = {
    gqlauthproviders: authProviderEnricher,
};

export default async (kind: string, definition: any): Promise<any> => {
    if (enrichers.hasOwnProperty(kind)) {
        return enrichers[kind](definition);
    }
    return definition;
};