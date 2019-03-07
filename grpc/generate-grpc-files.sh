# Generate JavaScript
grpc_tools_node_protoc \
  --js_out=import_style=commonjs,binary:./generated-ts \
  --grpc_out=./generated-ts \
  --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` \
  -I . \
  ./*.proto

# Generate TypeScript definitions
grpc_tools_node_protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --ts_out=./generated-ts \
  -I . \
  ./*.proto

cp -R generated-ts/ ../schema-registry/src/generated

protoc -I ./ gql_schema.proto --go_out=plugins=grpc:./generated-go
cp -R generated-go/ ../graphql-server/generated