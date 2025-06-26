#!/usr/bin/env bash
# exit if anything fails
set -e
set -o pipefail
# load env from .env
set -o allexport
source .env
set +o allexport

# start
if [[ -z "$1" ]]; then
  echo "Usage: $0 <sql_file>"
  exit 1
fi
docker exec -i yemektaxi-db dropdb -f -U $POSTGRES_USER $POSTGRES_DB
docker exec -i yemektaxi-db createdb -U $POSTGRES_USER $POSTGRES_DB
if { tar ztf $1 || tar tf $1; } >/dev/null 2>&1; then
  echo "it's a tar file"
  tar -xzOf $1 | docker exec -i yemektaxi-db psql -U $POSTGRES_USER
else
  echo "it's not a tar file"
  zcat -f $1 | docker exec -i yemektaxi-db psql -U $POSTGRES_USER
fi