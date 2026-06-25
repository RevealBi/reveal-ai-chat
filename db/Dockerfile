# Postgres pre-loaded with the sample seed. The base image runs everything in
# /docker-entrypoint-initdb.d once, against an empty data volume, on first boot.
# Build context is the `db/` folder:  docker build -f db/Dockerfile db
FROM postgres:16-alpine
COPY seed/ /docker-entrypoint-initdb.d/
