# TASK_MEMORY

Formato: ID / OBJETIVO / CONTEXTO / REQUISITOS / ESTADO / PENDÊNCIAS

## T1 — Fase 1: Setup do projeto — CONCLUÍDA (2026-08-19)
- Next.js+TS+Tailwind criado; Prisma 7 inicializado; estrutura `/core`, `/crm`,
  `/prisma`, `/packages/shared`, `/microapps`; `.env.example`; memória criada;
  backup + repo GitHub privado + push.
- PENDÊNCIAS: `DATABASE_URL` real (Neon) no `.env` local.

## T2 — Fase 2: Banco de dados — PENDENTE (próxima)
- Schema Prisma completo: `tenants`, `plans`, `users`, `tenant_users`,
  `crm_companies`, `crm_contacts`, `crm_leads`, `domain_events`.
- Primeira migration + políticas RLS nas tabelas com `tenant_id`.
- REQUISITOS: dono confirmar a Fase 1 e fornecer (ou criar) a URL do Neon.