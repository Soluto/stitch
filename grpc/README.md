# Generating Go and Typescript gRPC files

## Requirements

1. Install [Go](https://golang.org/doc/install).
   * Ensure you added `$GOPATH/bin` to `$PATH`.

2. Install [`protoc`](http://google.github.io/proto-lens/installing-protoc.html).

3. Run `yarn`

4. Install `grpc-tools` globally:

    ```bash
    npm install -g grpc-tools
    ```

5. Install `protoc-gen-go` (Go protocol buffer compiler plugin):

    ```bash
    go get -u github.com/golang/protobuf/protoc-gen-go
    ```

## Run

```bash
./generate-grpc-files.sh
```

## Verify

You can see files in *generated-ts* and *generated-go* folders.