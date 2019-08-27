# Stage 1: dependencies
FROM node:10-alpine as dependencies
WORKDIR /app
COPY package.json ./
RUN yarn --production

# Stage 2: build
FROM node:10-alpine as build
WORKDIR /app
COPY package.json ./
RUN yarn
COPY src ./src
COPY data ./data
COPY tsconfig.json ./
RUN yarn build

# Stage 3: release
FROM node:10-alpine as release
WORKDIR /app
COPY package.json ./
COPY --from=dependencies app/node_modules ./node_modules
COPY --from=build app/dist ./dist

CMD yarn start