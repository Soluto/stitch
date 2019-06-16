import https = require("https");
import * as express from "express";
import bodyParser = require("body-parser");
import fetch from "node-fetch";

var options = {
    key: process.env.PLATFORM_SSL_KEY,
    cert: process.env.PLATFORM_SSL_CERT,
    graphqlRegistryUrl: process.env.REGISTRY_URL,
    sourceName: process.env.GRAPHQL_SOURCE_NAME || "KUBERNETES"
};

const app = express();

const error = (res, reason) => {
    console.error(reason);
    return res.json({
        response: {
            allowed: false,
            status: {
                status: "Failure",
                message: "Failed to apply GQL schema - " + reason,
                reason,
                code: 402
            }
        }
    });
};

app.use("/validate", bodyParser.json(), async (req, res) => {
    if (!req.body) return error(res, "No body");
    const { kind, request } = req.body;

    if (kind !== "AdmissionReview")
        return error(res, "Accepting only AdmissionReview requests");

    if (request.object.kind !== "GqlSchema" || !request.object.spec)
        return error(res, "Accepting only GqlSchema validation request with spec");

    const gqlSchema = request.object.spec;
    const source = `${request.object.metadata.namespace}.${
        request.object.metadata.name
        }`;

    try {
        console.log(`validating new schema: ${source}`);
        const result = await fetch(
            `${options.graphqlRegistryUrl}/validate/${options.sourceName}/${source}`,
            {
                method: "POST",
                body: gqlSchema
            }
        );
        if (!result.ok) {
            throw new Error(`${result.status}: ${result.statusText}`);
        }
        console.log(`${source} is valid`);
    } catch (e) {
        return error(res, e);
    }

    return res.json({
        response: {
            allowed: true
        }
    });
});

export default {
    start: () => https.createServer(options, app).listen(443)
};
