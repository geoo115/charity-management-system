# ---------- Builder ----------
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /src

# Copy whole repo so module references resolve
COPY . /src

WORKDIR /src/backend

ENV CGO_ENABLED=0
ENV GO111MODULE=on

# Download dependencies
RUN go mod download

# Build binary
RUN go build -ldflags="-s -w" -o /bin/charity-backend ./cmd/api

# ---------- Runner ----------
FROM alpine:3.18

RUN apk add --no-cache ca-certificates

COPY --from=builder /bin/charity-backend /usr/local/bin/charity-backend

EXPOSE 8080
ENV PORT=8080

ENTRYPOINT ["/usr/local/bin/charity-backend"]
