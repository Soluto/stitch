FROM node:12-buster-slim as base
WORKDIR /build

FROM base as dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY . .

FROM dependencies as build-dependencies
RUN npm ci

FROM build-dependencies as test
RUN npm run test

FROM build-dependencies as build
RUN npm run build

FROM node:12-buster-slim
WORKDIR /service
COPY --from=dependencies /build/node_modules ./node_modules
COPY --from=build /build/dist ./dist
COPY deployment/docker/docker-entrypoint.sh ./docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]