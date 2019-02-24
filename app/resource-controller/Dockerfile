FROM node:10-alpine as base
WORKDIR /service

FROM base as dependencies
ARG target=RELEASE
COPY package.json yarn.lock ./
RUN yarn --production true
RUN if [ $target = "DEBUG" ]; then yarn --pure-lockfile --production false; fi

FROM dependencies as build
RUN yarn --production false
COPY . .
RUN yarn build

FROM base as release
RUN apk add --no-cache curl

COPY --from=dependencies /service/node_modules ./node_modules
COPY --from=build /service/dist ./dist
COPY --from=build /service/package.json .
COPY --from=build /service/yarn.lock .
ENV NODE_ENV=production

CMD [ "yarn", "start" ]
