FROM golang:1.12.7-stretch as base

WORKDIR /src
COPY . /src/

FROM base as build
RUN go mod download
RUN go build -o source .

FROM gcr.io/distroless/base
COPY --from=build /src/source /app/source

ENTRYPOINT [ "/app/source" ]