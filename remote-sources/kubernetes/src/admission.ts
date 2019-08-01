import bodyParser = require("body-parser");
import * as express from "express";
import https = require("https");
import fetch from "node-fetch";
import { AgogosObjectConfig } from "./object-types";

const options = {
    cert: process.env.PLATFORM_SSL_CERT,
    graphqlRegistryUrl: process.env.REGISTRY_URL,
    key: process.env.PLATFORM_SSL_KEY,
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
            spec: AgogosObjectConfig,
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
}

const buildResponse = (req: express.Request, message: string, code: number = 200): WebhookResponse => {
    const { apiVersion, kind, request: { uid } } = req.body;
    return {
        apiVersion,
        kind,
        response: {
            allowed: code === 200,
            status: {
                code,
                message,
            },
            uid,
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
    const spec: AgogosObjectConfig = vldObj.spec;
    const source = encodeURIComponent(`${vldObj.metadata.namespace}.${vldObj.metadata.name}`);

    try {
        console.log(`validating new ${vldObj.kind}: ${source}`);
        const result = await fetch(
            `${options.graphqlRegistryUrl}/validate/${options.sourceName}/${vldObj.kind.toLowerCase()}/${source}`,
            {
                body: JSON.stringify(spec, null, 4),
                headers: {
                    'Content-Type': "application/json",
                },
                method: "POST",
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
