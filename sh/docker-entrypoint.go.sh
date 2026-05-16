#!/bin/sh
set -e

case "$1" in
  worker)
    exec /usr/local/bin/worker
    ;;
  *)
    exec "$@"
    ;;
esac