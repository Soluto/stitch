# Stage 1 - dependencier
FROM node:10-alpine AS dependencies

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn --production

# Stage 2 - build
FROM node:10-alpine AS build

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn
COPY src ./src
COPY data ./data
COPY tsconfig.json ./
RUN yarn build

# Stage 3 - release
FROM node:10-alpine AS release
WORKDIR /app
COPY package.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

CMD yarn start