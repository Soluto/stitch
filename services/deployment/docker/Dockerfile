FROM node:lts-buster-slim as base
WORKDIR /build

FROM base as dependencies
RUN apt-get -qq update && apt-get -qq install -y \
  curl python make gcc g++ \
  && rm -rf /var/lib/apt/lists/*
RUN curl -s -L -o /bin/opa https://github.com/open-policy-agent/opa/releases/download/v0.26.0/opa_linux_amd64
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY . .

FROM dependencies as build-dependencies
RUN npm ci

FROM build-dependencies as test
ARG RUN_TESTS=true
RUN if [ "$RUN_TESTS" = "true" ]; then npm run test; fi

FROM build-dependencies as build
RUN npm run build

FROM node:lts-buster-slim
WORKDIR /service
COPY --from=dependencies /build/node_modules ./node_modules
COPY --from=build /build/dist ./dist
COPY deployment/docker/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=dependencies /bin/opa /bin/opa
RUN chmod 755 /bin/opa

ENTRYPOINT ["./docker-entrypoint.sh"]
