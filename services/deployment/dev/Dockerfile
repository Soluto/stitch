FROM node:lts-buster-slim
WORKDIR /service
COPY . .
RUN npm install
RUN apt-get update && apt-get install -y \
  curl \
  && rm -rf /var/lib/apt/lists/*
RUN curl -L -o /bin/opa https://github.com/open-policy-agent/opa/releases/download/v0.19.1/opa_linux_amd64
RUN chmod 755 /bin/opa
