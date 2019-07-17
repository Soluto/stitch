import upstreamAuthEnricher from './upstreamAuthEnricher';
import {AgogosObjectConfig, AgogosCustomResource} from '../object-types';

const enrichers: {
    [kind: string]: (obj: AgogosCustomResource) => Promise<AgogosObjectConfig>;
} = {
    upstreamclientcredentials: upstreamAuthEnricher,
};

export default async (resource: AgogosCustomResource<AgogosObjectConfig>): Promise<AgogosObjectConfig> => {
    const kind = resource.kind.toLowerCase();
    if (enrichers.hasOwnProperty(kind)) {
        return enrichers[kind](resource);
    }
    return resource.spec;
};
