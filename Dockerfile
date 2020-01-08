FROM node:12-buster-slim as base
WORKDIR /build

FROM base as dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM dependencies as build
RUN npm ci
COPY . .
RUN npm run build

FROM node:12-buster-slim
WORKDIR /service
COPY --from=dependencies /build/node_modules ./node_modules
COPY --from=build /build/dist ./dist

CMD ["node", "./dist/index.js"]