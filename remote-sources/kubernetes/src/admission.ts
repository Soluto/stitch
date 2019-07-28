import https = require("https");
import * as express from "express";
import bodyParser = require("body-parser");
import fetch from "node-fetch";
import { SchemaConfig } from "./object-types";
import { resolve } from "url";

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
    const request: WebhookRequest = req.body as WebhookRequest;
    if (!request) {
        res.json(buildResponse(req, "Expected AdmissionReview request body.\n\t\tsee https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#webhook-request-and-response for more details", 400))
        return;
    }
    const { request: { object: vldSubj } } = req.body;

    if (vldSubj.kind !== "Schema" || !vldSubj.spec) {
        res.json(buildResponse(req, "Accepting only Schema validation request with spec", 400));
        return;
    }

    const schema = vldSubj.spec as SchemaConfig;
    const source = `${vldSubj.metadata.namespace}.${vldSubj.metadata.name}`;

    try {
        console.log(`validating new schema: ${source}`);
        const result = await fetch(
            `${options.graphqlRegistryUrl}/validate/${options.sourceName}/${source}`,
            {
                method: "POST",
                body: schema
            }
        );
        if (!result.ok) {
            throw new Error(`${result.status}: ${result.statusText}`);
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
