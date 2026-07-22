# Food Delivery — API

NestJS + Drizzle ORM backend for the Food Delivery platform. REST endpoints plus a Socket.IO
gateway for real-time order updates and live driver location. See the [root README](../../README.md)
for the full project overview and setup.

## Stack

NestJS 11 · Drizzle ORM · PostgreSQL · Socket.IO · Redis (Keyv) · Passport JWT · Paystack ·
UploadThing · `@nestjs/schedule` (cron).

## Setup

```bash
cp .env.example .env          # fill in values (see the file for notes)
docker compose -f ../../docker/docker-compose.yml up -d   # Postgres + Redis
pnpm --filter @food-delivery/types build                  # build shared types first
pnpm --filter api db:migrate  # apply migrations
pnpm --filter api db:seed     # seed demo users
pnpm --filter api start:dev   # http://localhost:6000, prefix /api
```

## Scripts

| Script | Purpose |
|--------|---------|
| `start:dev` | Run in watch mode |
| `build` / `start:prod` | Compile to `dist/` / run compiled |
| `db:generate` | Generate a Drizzle migration from schema changes |
| `db:migrate` | Apply migrations |
| `db:studio` | Open Drizzle Studio |
| `db:seed` | Seed demo users |

## Conventions

- **Feature modules** live in `src/features/<name>/` (`*.controller.ts`, `*.service.ts`,
  `*.module.ts`, `dto/`). `features/restaurants` and `features/menu` are the reference shape.
- Global `TransformInterceptor` wraps every response as `{ status, message, data }`;
  `@ResponseMessage()` sets the message.
- Auth is on by default (global `JwtAuthGuard` + `RolesGuard`); opt out with `@Public()`,
  restrict with `@Roles(...)`.
- `numeric` columns serialize as **strings**; dates as ISO strings. The client contract lives in
  `packages/types` and must be updated alongside any response-shape change.
- Real-time: Socket.IO namespace `/orders` (JWT via `auth.token`). Ephemeral driver locations are
  stored in **Redis** via `CacheService`, never Postgres.

## Environment

See [`.env.example`](.env.example): `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`,
`PAYSTACK_SECRET_KEY`, `UPLOADTHING_TOKEN`, `PORT`.
