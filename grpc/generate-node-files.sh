# Generate JavaScript
grpc_tools_node_protoc \
  --js_out=import_style=commonjs,binary:./generated \
  --grpc_out=./generated \
  --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` \
  -I . \
  ./*.proto

# Generate TypeScript definitions
grpc_tools_node_protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --ts_out=./generated \
  -I . \
  ./*.proto

cp -R generated ../schema-registry/src