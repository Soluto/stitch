FROM golang:1.12.7-stretch as base

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

FROM base as build
RUN go build -o agogos .

FROM build as tests
RUN go test ./...

FROM gcr.io/distroless/base as release
COPY --from=build /src/agogos /app/agogos

ENTRYPOINT [ "/app/agogos" ]