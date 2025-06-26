#!/usr/bin/env bash

# start
if [[ -z "$1" ]]; then
  echo "Usage: $0 <ssh .config hostname>"
  exit 1
fi

scp $1:/home/ubuntu/yemektaxi-backend/backups/last/yemektaxi-latest.sql.gz ./backups/$1-latest.sql.gz