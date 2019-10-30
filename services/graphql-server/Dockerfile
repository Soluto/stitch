FROM golang:1.13.3-stretch as base

WORKDIR /src

COPY go.mod /src/go.mod
COPY go.sum /src/go.sum

RUN go mod download
COPY . /src/

FROM base as build
RUN go build -o agogos .

FROM build as tests
RUN go test ./...

FROM gcr.io/distroless/base as release
COPY --from=build /src/agogos /app/agogos

ENTRYPOINT [ "/app/agogos" ]