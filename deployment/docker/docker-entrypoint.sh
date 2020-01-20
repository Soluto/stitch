#!/usr/bin/env sh

SERVICE=$1

if [ "$SERVICE" = "registry" ]; then
    node ./dist/registry.js
elif [ "$SERVICE" = "gateway" ]; then
    node ./dist/gateway.js
else 
    echo "Unknown service selected, options are registry/gateway"
fi
