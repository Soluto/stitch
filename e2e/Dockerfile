FROM node:10.16-alpine
COPY package.json yarn.lock ./
RUN yarn
COPY ./utils ./utils
COPY ./tests ./tests

ENV GRAPHQL_SERVER_URL=http://gateway
ENV TIMOUT=60000

CMD yarn test