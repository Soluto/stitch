# Stage 1 - dependencier
FROM node:10-alpine AS dependencies

WORKDIR /app
COPY package.json ./
RUN yarn --production

# Stage 2 - build
FROM node:10-alpine AS build

WORKDIR /app
COPY src/ ./
COPY package.json tsconfig.json ./
RUN yarn
RUN yarn build

# Stage 3 - release
FROM dependencies AS release

WORKDIR /app
COPY --from=build /app/dist ./dist

CMD yarn start