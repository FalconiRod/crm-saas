# CHANGELOG

## 2026-08-20 — Fase 2: migrations APLICADAS no Neon + RLS verificado (SMOKE_OK)
- Migrations aplicadas no Neon (`prisma migrate deploy`; `migrate status`: up to date).
- DESCOBERTA CRÍTICA: o papel dono do Neon (`neondb_owner`) tem `BYPASSRLS=true`,
  que **ignora o RLS mesmo com FORCE** — o teste inicial "falhou no isolamento"
  por isso. Criado papel dedicado **`app_user`** (sem BYPASSRLS) com privilégios
  mínimos + default privileges; a app conecta via nova `APP_DATABASE_URL`
  (dono fica só para migrations via `DATABASE_URL`).
- `lib/prisma.ts` agora usa `APP_DATABASE_URL` (fallback `DATABASE_URL`) e
  explica o porquê em comentário.
- Adicionados `@prisma/adapter-pg`, `pg`, `@types/pg` (driver adapter do Prisma 7)
  e `tsx` (dev, para rodar os scripts de teste).
- `scripts/verify_db.ts` (smoke test RLS) reescrito com ordem correta → **`SMOKE_OK`**:
  planos seed (3), create/read dentro do tenant, isolamento (outro tenant vê 0),
  fail-closed REAL (INSERT sem `app.tenant_id` bloqueado pelo RLS — o bloqueio
  antigo era FK, não RLS), cleanup idempotente.
- Banco deixado LIMPO após os testes (0 tenants/companies/contacts/leads; 3 planos).
- `.env.example` documentado com as DUAS URLs + SQL de criação do `app_user`.
- Memória atualizada (DATABASE_MEMORY, CURRENT_STATE, RULES, TASK, SESSION, DECISIONS).
- PENDENTE: reportar ao dono e aguardar confirmação antes da Fase 3.

## 2026-08-19 — Fase 2 (Banco de dados) — migrations geradas, aplicação pendente
- Schema Prisma completo do MVP em `prisma/schema.prisma` (validado):
  `plans`, `tenants`, `users`, `tenant_users`, `crm_companies`, `crm_contacts`,
  `crm_leads`, `domain_events` + enums Role/PlanKey/PipelineStage.
- 3 migrations criadas:
  - `20260820000000_init` — tabelas/enums/índices (gerada via `migrate diff`).
  - `20260820000100_add_row_level_security` — RLS FORCE + policy `tenant_isolation`
    nas 6 tabelas com tenant_id (fail-closed via `app.tenant_id`).
  - `20260820000200_seed_plans` — 3 planos mock (INDIVIDUAL/TEAM/AGENCY).
- `DATABASE_MEMORY.md` criado.
- PENDENTE: aplicar no Neon (`prisma migrate deploy`) quando houver `DATABASE_URL`.

## 2026-08-19 — Fase 1 (Setup do projeto)
- Projeto criado com `create-next-app` (Next.js 16.3.1, React 19.2.8, TS, Tailwind 4).
- Prisma 7.9.1 instalado e inicializado (`prisma/schema.prisma`, `prisma.config.ts`,
  client em `app/generated/prisma` — gitignored). `prisma validate` e `generate` OK.
- Estrutura criada: `/core/{auth,tenancy,permissions,audit}`,
  `/crm/{contacts,leads,pipeline}`, `/packages/shared`, `/microapps` (READMEs explicando).
- `packages/shared/index.ts` com tipos base (Role, PlanKey, PipelineStage, PLAN_LIMITS);
  alias `@shared/*` no tsconfig.
- `.env` com placeholder do Neon + `.env.example` (commitável) + `.gitignore` liberando
  `.env.example`. Metadata do app atualizada.
- Memória persistente `docs/AI_MEMORY/` criada.
- Backup em `D:\PROJETOS\BACKUPS\BACKUP_CRM_SAAS_2026-08-19`.
- Repositório GitHub `FalconiRod/crm-saas` (privado) criado e pushado.