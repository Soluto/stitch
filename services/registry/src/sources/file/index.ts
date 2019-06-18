import * as fs from "fs";
import Source from "../../sources";
import * as util from "util";
import * as glob from "glob";
import * as path from "path";
import { GqlAgogosObjectConfig } from "../../sync/object-types";
import extractDefinition from "./extraction";

const globAsync = util.promisify(glob);

const readFileAsync = util.promisify(fs.readFile);

type NamedGqlObject = {
    name: string;
    kind: string;
    definition: GqlAgogosObjectConfig;
};

const createSource = (folder: string): Source => ({
    async getGqlObjects(): Promise<{ [kind: string]: { [name: string]: GqlAgogosObjectConfig } }> {
        const dir = path.join(__dirname, folder);
        const gqlObjectKinds = fs.readdirSync(dir);
        const objectsByKind = await Promise.all(gqlObjectKinds.map(async kind => await getGqlObjectsByKind(dir, kind)))
        return objectsByKind.reduce((acc, p) => ({ ...acc, [p.kind]: p.objects }), {});
    },

    async putGqlObject(name: string, kind: string, definition: GqlAgogosObjectConfig) {
        await fs.writeFileSync(`./${kind}/${name}.gql`, definition, { encoding: "utf8" });
    }
});

const getGqlObjectsByKind = async (folder: string, kind: string): Promise<{ kind: string, objects: { [name: string]: string } }> => {
    const files = await globAsync(`${folder}/${kind}/**/*.gql`);
    const getGqlObjectFromFiles: Promise<NamedGqlObject>[] = files.map(
        async (file: string) => {
            const fileNameMatch = file.match(/([^\/]+)(?=\.\w+$)/);
            if (!fileNameMatch) throw "error extracting filename";

            const [name] = fileNameMatch;
            const fileBuffer = await readFileAsync(file, "utf8");
            const definition = extractDefinition(kind, fileBuffer);
            return { name, kind, definition };
        }
    );

    const gqlByNames = await Promise.all(getGqlObjectFromFiles);

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
