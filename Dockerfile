# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS builder

WORKDIR /src

COPY apps/api/go.mod apps/api/go.sum ./apps/api/
RUN cd apps/api && go mod download

COPY apps/api ./apps/api

RUN cd apps/api && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/api ./src/cmd/api

FROM alpine:3.20

RUN apk add --no-cache ca-certificates curl

WORKDIR /app

COPY --from=builder /out/api /usr/local/bin/api
COPY package.json /app/package.json

EXPOSE 7270

ENTRYPOINT ["/usr/local/bin/api"]
