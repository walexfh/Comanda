# WFoods ComandaFácil

Sistema SaaS multi-tenant para gestão de bares e restaurantes — comanda eletrônica, cardápio digital e painel administrativo.

---

## Estrutura do Projeto

```
/
├── artifacts/
│   ├── api-server/        ← BACKEND — API REST + WebSocket (Node.js / Fastify / Drizzle ORM)
│   └── wfoods/            ← FRONTEND — Interface web (React / Vite / Tailwind CSS)
│
├── lib/
│   └── api-client-react/  ← Biblioteca compartilhada de hooks React para consumo da API
│
└── scripts/               ← Scripts utilitários do workspace
```

---

## Módulos

### Backend (`artifacts/api-server`)
- API REST autenticada por JWT
- WebSocket em tempo real (eventos de pedidos, cozinha, caixa)
- Banco de dados PostgreSQL com Drizzle ORM
- Multi-tenant: cada restaurante tem seu próprio slug e dados isolados
- Painel Master para gerenciar todos os restaurantes

### Frontend (`artifacts/wfoods`)
- **Admin Panel** — gestão de cardápio, mesas, garçons, relatórios
- **Garçom PWA** — comanda eletrônica mobile-first (tema escuro, offline-ready)
- **Cardápio Digital Público** — página de pedidos para clientes via QR Code
- **Painel Master** — acesso exclusivo do operador SaaS

---

## Credenciais de Desenvolvimento

| Acesso | URL | Usuário | Senha |
|--------|-----|---------|-------|
| Admin (demo) | `/login/admin` | `admin@demo.com` | `demo123` (slug: `demo`) |
| Garçom (demo) | `/login/garcom` | João / Maria / Carlos | `garcom123` |
| Master | `/master/login` | `walexferreiraegy@gmail.com` | `master123` |

---

## Rodando o Projeto

```bash
# Instalar dependências
pnpm install

# Backend (porta definida por $PORT)
pnpm --filter @workspace/api-server run dev

# Frontend (porta definida por $PORT)
pnpm --filter @workspace/wfoods run dev
```

---

## Tecnologias

| Camada | Stack |
|--------|-------|
| Backend | Node.js, Fastify, Drizzle ORM, PostgreSQL, WebSocket |
| Frontend | React 19, Vite, Tailwind CSS v4, TanStack Query, Wouter |
| Infra | Replit (pnpm monorepo, deploy automático) |
