# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS builder

WORKDIR /src

COPY apps/api/go.mod apps/api/go.sum ./apps/api/
RUN cd apps/api && go mod download

COPY apps/worker/go.mod apps/worker/go.sum ./apps/worker/
RUN cd apps/worker && go mod download

COPY apps/api ./apps/api
COPY apps/worker ./apps/worker

RUN cd apps/api && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/api ./src-go/cmd/api
RUN cd apps/worker && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/worker ./src-go/cmd/worker

FROM alpine:3.20

RUN apk add --no-cache ca-certificates curl

WORKDIR /app

COPY --from=builder /out/api /usr/local/bin/api
COPY --from=builder /out/worker /usr/local/bin/worker
COPY package.json /app/package.json
COPY sh/docker-entrypoint.go.sh /usr/local/bin/docker-entrypoint.sh

RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 7270

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["api"]
