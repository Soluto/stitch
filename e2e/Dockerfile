FROM node:10.16-alpine
COPY package.json yarn.lock ./
RUN yarn
COPY tsnodeRegister.js tsconfig.json ./
COPY ./utils ./utils
COPY ./tests ./tests

# Data for tests
COPY ./data ./data
COPY ./mocks ./mocks

# More data for tests
COPY ./mocks/customer-api/data ./mocks/customer-api/data
COPY ./mocks/order-api/data ./mocks/order-api/data

ENV TIMOUT=60000

CMD yarn test