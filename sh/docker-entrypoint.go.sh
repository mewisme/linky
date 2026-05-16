#!/bin/sh
set -e

case "$1" in
  api)
    if [ -n "$INTERNAL_API_SOCKET_PATH" ]; then
      socket_dir="$(dirname "$INTERNAL_API_SOCKET_PATH")"
      mkdir -p "$socket_dir"
    fi
    exec /usr/local/bin/api
    ;;
  worker)
    exec /usr/local/bin/worker
    ;;
  *)
    exec "$@"
    ;;
esac