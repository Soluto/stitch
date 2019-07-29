import https = require("https");
import * as express from "express";
import bodyParser = require("body-parser");
import fetch from "node-fetch";
import { SchemaConfig } from "./object-types";

var options = {
    key: process.env.PLATFORM_SSL_KEY,
    cert: process.env.PLATFORM_SSL_CERT,
    graphqlRegistryUrl: process.env.REGISTRY_URL,
    sourceName: process.env.GRAPHQL_SOURCE_NAME || "KUBERNETES"
};

const app = express();

type WebhookRequest = {
    apiVersion: string,
    kind: string,
    request: {
        uid: string,
        object: {
            kind: string,
            metadata: {
                name: string,
                namespace: string,
            }
            spec: any,
        }
    }
}

type WebhookResponse = {
    apiVersion: string,
    kind: string,
    response: {
        uid: string,
        allowed: boolean,
        status: {
            message: string,
            code: number,
        },
    },
};

const buildResponse = (req: express.Request, message: string, code: number = 200): WebhookResponse => {
    const { apiVersion, kind, request: { uid } } = req.body;
    return {
        apiVersion,
        kind,
        response: {
            uid,
            allowed: code === 200,
            status: {
                code,
                message,
            },
        },
    };
};

app.get("/health", (_: express.Request, res: express.Response): void => {
    res.json(true);
});

app.post("/validate", bodyParser.json(), async (req: express.Request, res: express.Response): Promise<void> => {
    if (!req.secure) {
        res.json(buildResponse(req, "Only HTTPS protocol supported", 401));
        return;
    }
    const requestBody: WebhookRequest = req.body;
    if (!requestBody) {
        res.json(buildResponse(req, "Expected AdmissionReview request body.\n\t\tsee https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#webhook-request-and-response for more details", 400))
        return;
    }
    const { request: { object: vldObj } } = requestBody;

    // TODO: Check that the kind is in list
    if (vldObj.kind !== "Schema" || !vldObj.spec) {
        res.json(buildResponse(req, "Accepting only Schema validation request with spec", 400));
        return;
    }

    const schema = vldObj.spec as SchemaConfig;
    const source = encodeURIComponent(`${vldObj.metadata.namespace}.${vldObj.metadata.name}`);

    try {
        console.log(`validating new schema: ${source}`);
        const result = await fetch(
            `${options.graphqlRegistryUrl}/validate/${options.sourceName}/${vldObj.kind.toLowerCase()}/${source}`,
            {
                method: "POST",
                body: JSON.stringify(schema, null, 4),
                headers: {
                    'Content-Type': "application/json",
                },
            },
        );
        if (!result.ok) {
            throw new Error(`Validation error: ${result.status}: ${result.statusText}`);
        }
        console.log(`${source} is valid`);
    } catch (e) {
        res.json(buildResponse(req, e.toString(), 400));
        return;
    }

    res.json(buildResponse(req, ""));
});

export default {
    start: () => https.createServer(options, app).listen(443, () => console.log("admission server started to listen on port 443")),
};
