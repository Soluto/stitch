import { GqlSchemaConfig } from "../../../sync/object-types";


export default (content: string): GqlSchemaConfig => ({
    definition: content,
});