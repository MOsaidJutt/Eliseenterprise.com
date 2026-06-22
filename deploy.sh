#!/bin/sh
# Run on the VPS, inside the vie013-dashboard repo, to ship a new version.
set -e
git pull
docker compose build app
docker compose up -d app
docker compose logs --tail=50 app
