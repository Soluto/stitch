import https = require("https");
import * as express from "express";
import bodyParser = require("body-parser");
import fetch from "node-fetch";

var options = {
  key: process.env.PLATFORM_SSL_KEY,
  cert: process.env.PLATFORM_SSL_CRT,
  graphqlRegistryUrl: process.env.GRAPHQL_REGISTRY_URL,
  sourceName: process.env.GRAPHQL_SOURCE_NAME || "kubernetes"
};

const app = express();

const error = (res, reason) => {
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

app.use("/gql-schema/validate", bodyParser.json(), async (req, res) => {
  if (!req.body) return error(res, "No body");
  const { kind, request } = req.body;

  if (kind !== "AdmissionReview")
    return error(res, "Accepting only AdmissionReview requests");

  if (request.object.kind !== "GqlSchema" || !request.object.spec)
    return error(res, "Accepting only GqlSchema validation request with spec");

  const gqlSchema = request.object.spec.gql;
  const source = `${request.object.metadata.namespace}.${
    request.object.metadata.name
  }`;

  try {
    await fetch(`${options.graphqlRegistryUrl}/${source}`, {
      method: "POST",
      body: gqlSchema
    });
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
