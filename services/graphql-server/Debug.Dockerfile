# Compile stage
FROM golang:1.13-alpine as build-env

RUN apk add --no-cache gcc g++ git

# Compile Delve
RUN go get github.com/go-delve/delve/cmd/dlv

RUN mkdir /src
WORKDIR /src

COPY go.mod /src/go.mod
COPY go.sum /src/go.sum

RUN go mod download
COPY . /src/

# The -gcflags "all=-N -l" flag helps us get a better debug experience
RUN go build -gcflags "all=-N -l" -o agogos .

# Final stage
FROM alpine:3.10

# Port 8080 belongs to our application, 40000 belongs to Delve
EXPOSE 8011 40000

# Allow delve to run on Alpine based containers.
RUN apk add --no-cache libc6-compat

WORKDIR /

COPY --from=build-env /src /
COPY --from=build-env /go/bin/dlv /

# Run delve
CMD ["/dlv", "--listen=:40000", "--headless=true", "--continue", "--api-version=2", "--accept-multiclient", "exec", "/agogos"]