FROM node:10-alpine as base
WORKDIR /service

FROM base as dependencies
ARG target
COPY package.json yarn.lock ./
RUN yarn --production true
RUN if [ "$target" = "DEBUG" ]; then yarn --pure-lockfile --production false; fi

FROM dependencies as build
RUN yarn --production false
COPY ./src ./src
COPY tsconfig.json ./
RUN yarn build

FROM build as tests
ARG target
RUN if [ "$target" == "PRODUCTION" ]; then yarn test; fi

FROM base as release
RUN apk add --no-cache curl

COPY --from=dependencies /service/node_modules ./node_modules
COPY --from=build /service/dist ./dist
COPY --from=build /service/package.json .
COPY --from=build /service/tsconfig.json .
COPY --from=build /service/yarn.lock .
ENV NODE_ENV=production

CMD [ "yarn", "start" ]
