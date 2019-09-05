# Stage 1: Base
FROM golang:1.13-stretch as base

# Enable the go modules feature
ENV GO111MODULE=on
# Set the GOPROXY environment variable
ENV GOPROXY=https://goproxy.io

RUN mkdir /src
WORKDIR /src

COPY go.mod /src/go.mod
COPY go.sum /src/go.sum

RUN go mod download
COPY . /src/

# Stage 2: Build
FROM base as build
RUN go build -o agogos .

# Stage 3: Tests
FROM build as tests
RUN go test ./...

# Stage 4: Release
FROM gcr.io/distroless/base as release
COPY --from=build /src/agogos /app/agogos

ENTRYPOINT [ "/app/agogos" ]