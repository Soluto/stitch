# Clean JS/TS output folder
rm -rf ./generated-ts/*

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

# Clean TS folder in schema-registry
rm -rf ../schema-registry/src/generated/*

# Copy generated files to schema-registry
cp -R generated-ts/ ../schema-registry/src/generated

# Clean Go output folder
rm -rf ./generated-go/*

# Generage Go
protoc -I ./ gql_configuration.proto --go_out=plugins=grpc:./generated-go

# Clean graphql-server folder
rm -rf ../graphql-server/generated/*

# Copy generated files to graphql-server
cp -R generated-go/ ../graphql-server/generated