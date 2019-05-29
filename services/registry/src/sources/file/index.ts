import * as fs from "fs";
import Source from "../../sources";
import * as util from "util";
import * as glob from "glob"

const globAsync = util.promisify(glob);

const readFileAsync = util.promisify(fs.readFile);

type NamedGqlSchema = {
    name: string;
    gqlSchema: string;
};

const remoteSource: Source = {
    async getSchemas() {
        const files = await globAsync("**/*.gql", {});
        const getSchemaFromFiles: Promise<NamedGqlSchema>[] = files.map(
            async (file: string) => {
                const fileNameMatch = file.match(/([^\/]+)(?=\.\w+$)/);
                if (!fileNameMatch) throw "error extracting filename";

                const [name] = fileNameMatch;
                const fileBuffer = await readFileAsync(file, "utf8");
                return { name: name, gqlSchema: fileBuffer };
            }
        );

        const gqlByNames = await Promise.all(getSchemaFromFiles);

        return gqlByNames.reduce(
            (agg, { name, gqlSchema }) => ({
                ...agg,
                [name]: gqlSchema
            }),
            {}
        );
    },

    async registerSchema(name: string, gqlSchema: string) {
        await fs.writeFileSync(`./${name}.gql`, gqlSchema);
    }
};

export default remoteSource;
