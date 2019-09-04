#!/bin/bash

# Adapted from https://docs.docker.com/config/containers/multi-service_container/

PORT=8000 REGISTRY_URL=localhost:8002 ./gateway&
status=$?
if [ $status -ne 0 ]; then
  echo "Failed to start gateway: $status"
  exit $status
fi

cd registry
PORT=8001 GRPC_PORT=8002 REMOTESOURCE__KUBERNETES_FS=http://localhost:8003 yarn start&
status=$?
if [ $status -ne 0 ]; then
  echo "Failed to start registry: $status"
  exit $status
fi
cd ..

PORT=8003 RESOURCE_FOLDER=/resources ./source-kubernetes-fs&
status=$?
if [ $status -ne 0 ]; then
  echo "Failed to start kubernetes fs source: $status"
  exit $status
fi

# Naive check runs checks once a minute to see if either of the processes exited.
# This illustrates part of the heavy lifting you need to do if you want to run
# more than one service in a container. The container exits with an error
# if it detects that either of the processes has exited.
# Otherwise it loops forever, waking up every 60 seconds

while sleep 60; do
  ps aux | grep gateway | grep -q -v grep
  GATEWAY_STATUS=$?

  ps aux | grep node | grep -q -v grep
  REGISTRY_STATUS=$?

  ps aux | grep source-kubernetes-fs | grep -q -v grep
  SOURCE_STATUS=$?

  # If the greps above find anything, they exit with 0 status
  # If they are not both 0, then something is wrong
  if [ $GATEWAY_STATUS -ne 0 -o $REGISTRY_STATUS -ne 0 -o $SOURCE_STATUS -ne 0 ]; then
    echo "One of the processes has already exited."
    exit 1
  fi
done