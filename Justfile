# Justfile — quick commands

# Development
dev:
  podman-compose up -d
  sleep 3
  just db-push
  just dev-api & just dev-web

dev-api:
  cd apps/api && pnpm dev

dev-web:
  cd apps/web && pnpm dev

# Database
db-push:
  cd apps/api && pnpm drizzle-kit push

db-generate:
  cd apps/api && pnpm drizzle-kit generate

db-studio:
  cd apps/api && pnpm drizzle-kit studio

# Testing
test:
  pnpm -r run test

test-api:
  cd apps/api && pnpm test

test-web:
  cd apps/web && pnpm test

test-e2e:
  cd apps/web && pnpm exec playwright test

# Build
build:
  pnpm -r run build

# Lint
lint:
  pnpm -r run lint

# Install dependencies
install:
  pnpm install

# Install yt-dlp standalone binary (no sudo, no pip) to ~/.local/bin
install-ytdlp:
  mkdir -p ~/.local/bin
  curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/.local/bin/yt-dlp
  chmod +x ~/.local/bin/yt-dlp
  ~/.local/bin/yt-dlp --version
