import * as fs from "fs";
import * as glob from "glob";
import * as util from "util";

import Source from "../../sources";
import { AgogosObjectConfig } from "../../sync/object-types";
import extractDefinition, { getExtensionByKind } from "./extraction";

const globAsync = util.promisify(glob);

type NamedAggObject = {
    name: string;
    kind: string;
    definition: AgogosObjectConfig;
}

const createSource = (dir: string): Source => ({
    async getAgogosObjects(): Promise<{
        [kind: string]: { [name: string]: AgogosObjectConfig };
    }> {
        const gqlObjectKinds = fs.readdirSync(dir);
        const objectsByKind = await Promise.all(
            gqlObjectKinds.map(kind => getAggObjectsByKind(dir, kind))
        );
        return objectsByKind.reduce(
            (acc, p) => ({ ...acc, [p.kind]: p.objects }),
            {}
        );
    },

    async putAgogosObject(
        name: string,
        kind: string,
        definition: AgogosObjectConfig
    ) {
        await fs.writeFileSync(
            `./${kind}/${name}.${getExtensionByKind(kind)}`,
            definition,
            { encoding: "utf8" }
        );
    }
});

const getAggObjectsByKind = async (
    folder: string,
    kind: string
): Promise<{ kind: string; objects: { [name: string]: string } }> => {
    const files = await globAsync(`${folder}/${kind}/**/*.{gql,json}`);
    const getAggObjectFromFiles: Array<Promise<NamedAggObject>> = files.map(
        async (file: string) => {
            const fileNameMatch = file.match(/([^\/]+)(?=\.\w+$)/);
            if (!fileNameMatch) { throw new Error("error extracting filename"); }

            const [name] = fileNameMatch;
            const definition = await extractDefinition(kind, file);
            return { name, kind, definition };
        }
    );

    const gqlByNames = await Promise.all(getAggObjectFromFiles);

    const objects = gqlByNames.reduce(
        (agg, { name, definition }) => ({
            ...agg,
            [name]: definition
        }),
        {}
    );

    return { kind, objects };
};

export default createSource;
