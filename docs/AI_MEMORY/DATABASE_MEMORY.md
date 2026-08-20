# DATABASE_MEMORY

_Estrutura REAL do banco. Fonte de verdade: `prisma/schema.prisma` + migrations._

## Stack
- PostgreSQL gerenciado no **Neon** (dev) via Prisma 7.
- Client gerado em `app/generated/prisma` (gitignored) — import de `@/app/generated/prisma/client`.
- **DUAS URLs** (ver "Papéis do banco"): `DATABASE_URL` (dono → migrations,
  lida pelo `prisma.config.ts`) e `APP_DATABASE_URL` (app_user → runtime, usada
  por `lib/prisma.ts`).

## Papéis do banco (CRÍTICO)
- O papel **dono** no Neon tem `BYPASSRLS = true` → **ignora RLS mesmo com FORCE**.
- A aplicação conecta SEMPRE com **`app_user`** (sem BYPASSRLS) com privilégios
  mínimos (USAGE schema + DML tabelas/sequences + default privileges).
- **FALHA RÁPIDA**: `lib/prisma.ts` lança erro no boot se `APP_DATABASE_URL`
  estiver ausente — NUNCA cai para a URL do dono.
- Setup reproduzível: `psql "<DATABASE_URL>" -f scripts/grant_app_user.sql`
  (idempotente) + `ALTER ROLE app_user WITH PASSWORD '...'`.

## Tabelas (MVP)

### `plans` — planos (referência GLOBAL, sem tenant_id, SEM RLS)
`id, key (PlanKey), name, maxUsers?, maxCompaniesPerAccount?, maxContacts?,
maxLeads?, priceCents, tenants[]`. Seed: INDIVIDUAL, TEAM, AGENCY.
Limites são lidos DO BANCO (fonte da verdade) no enforcement e na UI.

### `tenants` — quem PAGA o SaaS
`id, name, planId→plans, settings Json, createdAt` + relações (users, crm_*,
events, invitations). RLS FORCE por comando (Fase 10):
SELECT = membro/ativo; INSERT = id = app.tenant_id; **UPDATE/DELETE = só OWNER**.

### `users` — identidade GLOBAL (via Clerk) — SEM tenant_id, SEM RLS
`id, name, email (unique), authProviderId (unique, nullable), createdAt`.

### `tenant_users` — N:N usuário<->tenant com papel
`tenantId, userId, role (Role), @@id([tenantId,userId])`. RLS FORCE por comando
(Fase 10): SELECT = membro/ativo; INSERT = só o próprio usuário E papel vindo de
convite PENDING (ou 1º OWNER na criação do workspace); **UPDATE/DELETE = só
OWNER/ADMIN** (bloqueia auto-escalada). `@@index([userId])`.

### `invitations` — convite por e-mail (Fase 9)
`id, tenantId, email, role (Role, nunca OWNER), invitedBy?→users (SetNull),
status (PENDING/ACCEPTED/REVOKED), createdAt, acceptedAt?`.
RLS FORCE por comando (Fase 10): SELECT = membro do tenant OU o próprio
convidado (email = app.user_email); INSERT/UPDATE/DELETE = só OWNER/ADMIN do
tenant (o convidado NÃO altera o próprio convite). `@@index([tenantId,email])`,
`@@index([email,status])`.
**O convite NÃO é marcado ACCEPTED no aceite**: "aceito" é derivado da existência
do vínculo (mudança na Fase 10 para fechar o tamper via RLS).

### `crm_companies` — empresa-CLIENTE do CRM (≠ tenants)
`id, tenantId, name, cnpj?, city?, phone?, email?, notes?, createdAt, updatedAt`.
RLS FORCE (tenant_id = app.tenant_id). `@@index([tenantId])`.

### `crm_contacts`
`id, tenantId, crmCompanyId?→crm_companies (SetNull), name, phone?, email?,
tags String[], origin?, status?, createdAt, updatedAt`. RLS FORCE.
`@@index([tenantId])`, `@@index([tenantId,crmCompanyId])`.

### `crm_leads`
`id, tenantId, contactId→crm_contacts (Cascade), stage (PipelineStage, default
NOVO), value Decimal(12,2)?, origin?, ownerUserId?→users (SetNull),
probability Int? default 0, notes?, createdAt, updatedAt`. RLS FORCE.
`@@index([tenantId])`, `@@index([tenantId,stage])`, `@@index([tenantId,contactId])`,
`@@index([tenantId,ownerUserId])`.

### `crm_tasks` (Fase 11)
`id, tenantId, title, notes?, dueAt?, status (TaskStatus, default PENDING),
contactId?→crm_contacts (SetNull), leadId?→crm_leads (SetNull),
assigneeId?→users (SetNull), createdById?→users (SetNull), createdAt, updatedAt`.
RLS FORCE (policy única `tenant_isolation`).
`@@index([tenantId,status])`, `@@index([tenantId,dueAt])`,
`@@index([tenantId,assigneeId])`, `@@index([tenantId,contactId])`,
`@@index([tenantId,leadId])`, `@@index([tenantId])`.
**Atenção:** FK IGNORA RLS — vínculos (contato/lead/responsável) são validados
na server action dentro do tenant ativo (ver D21/RULES).

### `domain_events` — eventos + auditoria (mesma tabela)
`id, tenantId, userId?→users (SetNull), type, payload Json, isAudit Bool, ip?,
createdAt`. RLS FORCE. `@@index([tenantId,createdAt])`.

## Enums
- `Role`: OWNER ADMIN MANAGER USER VIEWER
- `PlanKey`: INDIVIDUAL TEAM AGENCY
- `PipelineStage`: NOVO CONTATO INTERESSADO PROPOSTA NEGOCIACAO GANHO PERDIDO
- `InvitationStatus`: PENDING ACCEPTED REVOKED
- `TaskStatus`: PENDING DONE

## RLS (estado atual — migrations 001 + 003 + 007 + **008_harden_rls_and_indexes**)
- Tabelas com RLS FORCE: tenants, tenant_users, invitations, crm_companies,
  crm_contacts, crm_leads, crm_tasks, domain_events.
- **Fase 10 (008):** policies de tenants/tenant_users/invitations foram
  trocadas por policies POR COMANDO (select/insert/update/delete) com regras
  de papel (ver acima). crm_* e domain_events seguem a policy única
  `tenant_isolation` (`tenant_id = app.tenant_id`).
- Variáveis de sessão por transação (core/tenancy/tenancy.ts):
  `app.tenant_id`, `app.user_id` (bootstrap), `app.user_email` (leitura de
  convite pelo convidado).
- Fail-closed: sem `app.tenant_id` → nenhuma linha retorna.
- Cascades (tenant delete) passam pelo sistema e NÃO são filtradas por RLS
  (verificado nos smoke tests).

## Migrations (aplicadas)
- `20260820000000_init` — tabelas + enums + índices.
- `20260820000100_add_row_level_security` — policies RLS.
- `20260820000200_seed_plans` — 3 planos.
- `20260820000300_tenancy_session` — bootstrap via app.user_id.
- `20260820000400_crm_company_fields` — cnpj, city.
- `20260820000500_plan_limits` — max_contacts + empresas=5.
- `20260820000600_lead_limits` — max_leads.
- `20260820000700_invitations` — tabela + enum + RLS.
- `20260820000800_harden_rls_and_indexes` — RLS por comando + índices.
- `20260820001000_crm_tasks` — tabela + enum TaskStatus + RLS FORCE + índices.

## Status
- Todas as migrations **APLICADAS no Neon** (`migrate deploy` OK).
- RLS verificado por smoke tests com `app_user`: `verify_db.ts`,
  `verify_tenancy.ts`, `verify_hardening.ts` (HARDENING_OK — bloqueia
  auto-escalada, tamper de convite e exclusão/rename por não-dono).