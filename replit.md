# WFoods ComandaFácil

## Overview

SaaS system for bars and restaurants — multi-tenant, real-time, with waiter app, admin panel, digital menu and automatic printing support.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifact: `wfoods`, port 26233, preview path `/`)
- **API framework**: Express 5 (artifact: `api-server`, port 8080, paths `/api`, `/ws`)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **WebSocket**: `ws` library for real-time order broadcasts

## Architecture

- **Multi-tenant**: all data is isolated by `tenant_id`
- **Auth**: token-based (stored in localStorage as `wfoods_token`), parsed in `api-server/src/middlewares/auth.ts`
- **Real-time**: WebSocket at `/ws` — clients subscribe by tenantId, server broadcasts `order:new` and `order:updated` events
- **Password hashing**: SHA-256 with `wfoods_salt_2024` suffix (in `api-server/src/lib/auth.ts`)

## Demo credentials

- **Tenant slug**: `demo`
- **Admin**: email=`admin@demo.com`, password=`demo123`
- **Waiter**: name=`João`, `Maria`, or `Carlos`, password=`garcom123`
- **Public menu**: `/menu/demo`

## Database Schema

Tables: `tenants`, `users`, `waiters`, `categories`, `products`, `tables`, `orders`, `order_items`, `payments`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/wfoods run dev` — run frontend locally

## App Pages

### Public
- `/` — Landing with login selector
- `/login/admin` — Admin login
- `/login/garcom` — Waiter login
- `/menu/:tenantSlug` — Public digital menu (QR code access)

### Admin (requires admin auth)
- `/admin` — Dashboard with real-time orders and revenue summary
- `/admin/orders` — Full order list with status management
- `/admin/cardapio` — Menu management (categories + products)
- `/admin/mesas` — Table management + QR code links
- `/admin/garcons` — Waiter management
- `/admin/caixa` — Cash register and payments
- `/admin/relatorios` — Sales reports

### Waiter (requires waiter auth)
- `/garcom` — Table selector (PWA-optimized, no images)
- `/garcom/pedido/:tableId` — Fast order entry screen

## Automatic Printing (Local Service)

The system broadcasts print events via WebSocket. A local Node.js printer service can connect to `/ws`, subscribe to a tenant, and print orders by sector (cozinha/bar) using `printSector` field on order items.

Example message format:
```json
{ "type": "order:new", "order": { "id": 1, "items": [{ "printSector": "cozinha", ... }] } }
```
