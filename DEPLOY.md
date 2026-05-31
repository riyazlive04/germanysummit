# Deployment notes

> The build is **not** deployed here - these are the operator's notes for shipping
> to the existing Hostinger VPS (Docker + PM2 + Traefik, Cloudflare DNS).

## 0. Before you ship

1. **Rotate the Anthropic key.** The key used in local dev was shared in plaintext
   during development - generate a fresh one in the Anthropic console and set it
   only in the server environment (never in `.env.example` or git).
2. **Switch Postgres on.** Local dev uses SQLite. For production:
   - In `prisma/schema.prisma`, set `datasource db { provider = "postgresql" }`.
   - The JSON columns are stored as encoded strings and are portable as-is; no
     code changes needed (see `src/lib/submission.ts`). If you later want native
     `Json` columns on Postgres, that's the only file that changes.
3. **Set a real `ADMIN_KEY`.** The `/room` view is gated by it. Default is
   `change-me` - change it.

## 1. Environment variables (runtime)

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection string |
| `ANTHROPIC_API_KEY` | Server-side LLM key |
| `ANTHROPIC_MODEL` | optional, defaults to `claude-sonnet-4-6` |
| `LLM_PROVIDER` | defaults to `anthropic` |
| `N8N_WEBHOOK_URL` | n8n webhook (Sheets + WhatsApp fan-out); empty = silently skipped |
| `ADMIN_KEY` | `/room` gate |
| `NEXT_PUBLIC_SITE_URL` | public base URL for absolute OG/social image URLs |

## 2. Database migration

Generate a migration from the schema once, then apply on each release:

```bash
# first time (creates prisma/migrations)
npx prisma migrate dev --name init        # locally, against a dev Postgres
# on the server, every release
npx prisma migrate deploy
```

For a quick first bring-up without migration history you can use
`npx prisma db push`.

## 3a. Docker

```bash
docker build -t germany-readiness-suite .
docker run -d --name grs \
  -e DATABASE_URL="postgresql://user:pass@db:5432/grs" \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -e N8N_WEBHOOK_URL="https://n8n.example.com/webhook/..." \
  -e ADMIN_KEY="a-strong-key" \
  -e NEXT_PUBLIC_SITE_URL="https://app.germanycareersummit.com" \
  -p 3000:3000 germany-readiness-suite
```

Run migrations before the first start, e.g. a one-off:
`docker run --rm -e DATABASE_URL=... germany-readiness-suite npx prisma migrate deploy`.

### Traefik labels (docker-compose)

```yaml
services:
  app:
    image: germany-readiness-suite
    environment:
      DATABASE_URL: ${DATABASE_URL}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      N8N_WEBHOOK_URL: ${N8N_WEBHOOK_URL}
      ADMIN_KEY: ${ADMIN_KEY}
      NEXT_PUBLIC_SITE_URL: https://app.germanycareersummit.com
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.grs.rule=Host(`app.germanycareersummit.com`)"
      - "traefik.http.routers.grs.entrypoints=websecure"
      - "traefik.http.routers.grs.tls.certresolver=letsencrypt"
      - "traefik.http.services.grs.loadbalancer.server.port=3000"
    networks: [web]
```

## 3b. PM2 (no Docker)

```bash
npm ci && npm run build
npx prisma migrate deploy
pm2 start ecosystem.config.js
pm2 save
```

Put Traefik (or Nginx) in front, proxying to `127.0.0.1:3000`.

## 4. Notes

- `next.config.mjs` uses `output: "standalone"`, so the Docker image ships a
  self-contained `server.js` with traced `node_modules` (Prisma, `pdf-parse`,
  `next/og`). Both build and run stages are Alpine so the Prisma musl engine
  matches the runtime.
- `pdf-parse` is kept external (`serverComponentsExternalPackages`) so the PDF
  route loads it correctly. If a future Next upgrade stops tracing it into
  standalone, add a `COPY` for `node_modules/pdf-parse`.
- The n8n webhook is non-blocking with retry; if it's down, attendees still get
  their results - delivery just no-ops.
