# syntax=docker/dockerfile:1

FROM golang:1.24-alpine AS builder

WORKDIR /src
COPY apps/worker/go.mod apps/worker/go.sum ./apps/worker/
RUN cd apps/worker && go mod download
COPY apps/worker ./apps/worker
RUN cd apps/worker && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/worker ./src/cmd/worker

FROM alpine:3.20

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /out/worker /usr/local/bin/worker
COPY package.json /app/package.json
COPY sh/docker-entrypoint.go.sh /usr/local/bin/docker-entrypoint.sh

RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["worker"]
