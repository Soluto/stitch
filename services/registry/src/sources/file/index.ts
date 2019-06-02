import * as fs from "fs";
import Source from "../../sources";
import * as util from "util";
import * as glob from "glob";

const globAsync = util.promisify(glob);

const readFileAsync = util.promisify(fs.readFile);

type NamedGqlObject = {
    name: string;
    kind: string;
    definition: string;
};

const remoteSource: Source = {
    async getGqlObjects(kind: string): Promise<{ [name: string]: string }> {
        const builtInObjects = await globAsync(`./builtin-resources/${kind}/*.gql`)
        const files = await globAsync(`./${kind}/*.gql`, {});
        const getGqlObjectFromFiles: Promise<NamedGqlObject>[] = [...builtInObjects, ...files].map(
            async (file: string) => {
                const fileNameMatch = file.match(/([^\/]+)(?=\.\w+$)/);
                if (!fileNameMatch) throw "error extracting filename";

                const [name] = fileNameMatch;
                const fileBuffer = await readFileAsync(file, "utf8");
                return { name, kind, definition: fileBuffer };
            }
        );

        const gqlByNames = await Promise.all(getGqlObjectFromFiles);

        return gqlByNames.reduce(
            (agg, { name, definition }) => ({
                ...agg,
                [name]: definition
            }),
            {}
        );
    },

    async putGqlObject(name: string, kind: string, definition: string) {
        await fs.writeFileSync(`./${kind}/${name}.gql`, definition, { encoding: "utf8" });
    }
};

export default remoteSource;
