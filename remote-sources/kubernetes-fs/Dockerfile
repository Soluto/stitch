FROM golang:1.13.4-stretch as base

WORKDIR /src
COPY . /src/

FROM base as build
RUN go mod download
RUN go build -o source .

FROM gcr.io/distroless/base
COPY --from=build /src/source /app/source

ENTRYPOINT [ "/app/source" ]