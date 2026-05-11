#!/bin/sh
set -e

case "$1" in
  api)
    cd /app/apps/api
    exec node --import=./dist/instrument.js ./dist/index.js
    ;;

  worker)
    cd /app/apps/worker
    exec node --import=./dist/instrument.js ./dist/index.js
    ;;

  *)
    exec "$@"
    ;;
esac