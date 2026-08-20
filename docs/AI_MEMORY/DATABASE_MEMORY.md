# DATABASE_MEMORY

_Estrutura REAL do banco. Fonte de verdade: `prisma/schema.prisma` + migrations._

## Stack
- PostgreSQL gerenciado no **Neon** (dev) via Prisma 7.
- Client gerado em `app/generated/prisma` (gitignored) — import de `@/app/generated/prisma/client`.
- **DUAS URLs** (ver seção "Papéis do banco"): `DATABASE_URL` (dono → migrations,
  lida pelo `prisma.config.ts`) e `APP_DATABASE_URL` (app_user → runtime, usada por
  `lib/prisma.ts`).

## Papéis do banco (CRÍTICO)
- O papel **dono** no Neon tem `BYPASSRLS = true` (confirmado: `rolbypassrls=true`).
  BYPASSRLS **ignora o RLS completamente, mesmo com `FORCE ROW LEVEL SECURITY`**.
- POR ISSO a aplicação conecta com o papel **`app_user`** (criado sem BYPASSRLS,
  confirmado `rolbypassrls=false`), com privilégios mínimos:
  `USAGE` no schema + `SELECT/INSERT/UPDATE/DELETE` nas tabelas e sequences +
  default privileges (para tabelas futuras das migrations). Migrations continuam
  rodando com o dono (`DATABASE_URL`).
- SQL de criação do papel está documentado em `.env.example`.

## Tabelas (MVP)

### `plans` — planos (referência GLOBAL, sem tenant_id, SEM RLS)
`id, key (enum PlanKey), name, maxUsers (Int?), maxCompaniesPerAccount (Int?),
priceCents, tenants[]`
Seed na migration `20260820000200_seed_plans`: INDIVIDUAL (1/1/0),
TEAM (10/1/9900), AGENCY (50/NULL/29900).

### `tenants` — quem PAGA o SaaS
`id, name, planId→plans, settings Json, createdAt, users[], companies[],
contacts[], leads[], events[]` — RLS FORCE (policy: `id = app.tenant_id`).

### `users` — identidade GLOBAL (via Clerk, Fase 3)
`id, name, email (unique), authProviderId (unique, nullable), createdAt,
tenantUsers[], ownedLeads[], events[]` — SEM tenant_id, SEM RLS.

### `tenant_users` — N:N usuário<->tenant com papel
`tenantId, userId, role (enum Role), @@id([tenantId,userId])` — RLS FORCE.

### `crm_companies` — empresa-CLIENTE do CRM (≠ tenants)
`id, tenantId, name, phone?, email?, notes?, createdAt, updatedAt, contacts[]` — RLS FORCE.

### `crm_contacts`
`id, tenantId, crmCompanyId?→crm_companies (SetNull), name, phone?, email?,
tags String[], origin?, status?, createdAt, updatedAt, leads[]` — RLS FORCE.

### `crm_leads`
`id, tenantId, contactId→crm_contacts (Cascade), stage (enum PipelineStage,
default NOVO), value Decimal(12,2)?, origin?, ownerUserId?→users (SetNull),
probability Int? default 0, notes?, createdAt, updatedAt` — RLS FORCE.

### `domain_events` — eventos + auditoria (mesma tabela)
`id, tenantId, userId?→users (SetNull), type, payload Json, isAudit Bool,
ip?, createdAt, @@index([tenantId, createdAt])` — RLS FORCE.

## Enums
- `Role`: OWNER ADMIN MANAGER USER VIEWER
- `PlanKey`: INDIVIDUAL TEAM AGENCY
- `PipelineStage`: NOVO CONTATO INTERESSADO PROPOSTA NEGOCIACAO GANHO PERDIDO

## RLS (migrations `20260820000100_add_row_level_security` + `20260820000300_tenancy_session`)
- Tabelas com RLS FORCE: tenants, tenant_users, crm_companies, crm_contacts,
  crm_leads, domain_events.
- Policy `tenant_isolation` (base):
  `USING (tenant_id = nullif(current_setting('app.tenant_id', true), ''))`
  (`tenants` usa `id` no lugar de `tenant_id`).
- **Bootstrap (migration 20260820000300):** `tenant_users` e `tenants` aceitam
  também `app.user_id` (id LOCAL de `users`) para o usuário listar os PRÓPRIOS
  vínculos (workspace switcher). `WITH CHECK` de tenant_users = `tenant_id =
  app.tenant_id` (ninguém se auto-adiciona a tenant alheio). Dados de CRM
  seguem 100% fechados por `app.tenant_id`.
- `FORCE` é essencial para o caso de alguém conectar como dono; mas **dono com
  BYPASSRLS ignora RLS mesmo com FORCE** → a aplicação usa `app_user`.
- Fail-closed: sem `app.tenant_id` definido → nenhuma linha retorna (testado).
- A aplicação define as variáveis dentro de cada transação (helper
  `core/tenancy/tenancy.ts`): `SELECT set_config('app.tenant_id', $1, true)`
  e `SELECT set_config('app.user_id', $1, true)`.
- VERIFICADO (`scripts/verify_db.ts` SMOKE_OK + `scripts/verify_tenancy.ts`
  TENANCY_OK): create/read dentro do tenant OK; outro tenant vê 0; INSERT sem
  `app.tenant_id` bloqueado; usuário só vê os próprios vínculos; dono apaga o
  workspace via cascade.

## Migrations
- `20260820000000_init`: tabelas + enums + índices.
- `20260820000100_add_row_level_security`: policies RLS.
- `20260820000200_seed_plans`: 3 planos.

## Status
- **APLICADO no Neon** (`prisma migrate deploy` OK; `migrate status` up to date).
- Papel `app_user` criado (sem BYPASSRLS) e usado pela aplicação
  (`APP_DATABASE_URL`). RLS verificado via smoke test → `SMOKE_OK`.