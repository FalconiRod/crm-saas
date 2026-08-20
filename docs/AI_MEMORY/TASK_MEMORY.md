# TASK_MEMORY

Formato: ID / OBJETIVO / CONTEXTO / REQUISITOS / ESTADO / PENDÊNCIAS

## T1 — Fase 1: Setup do projeto — CONCLUÍDA (2026-08-19)
- Next.js+TS+Tailwind criado; Prisma 7 inicializado; estrutura `/core`, `/crm`,
  `/prisma`, `/packages/shared`, `/microapps`; `.env.example`; memória criada;
  backup + repo GitHub privado + push.
- PENDÊNCIAS: `DATABASE_URL` real (Neon) no `.env` local.

## T2 — Fase 2: Banco de dados — CONCLUÍDA (2026-08-20)
- Schema completo, 3 migrations APLICADAS no Neon; RLS verificado (SMOKE_OK)
  com papel `app_user` (dono tem BYPASSRLS — descoberta documentada).
- PENDÊNCIAS: reportar ao dono + aguardar confirmação; inspecionar 3 vulns do
  npm audit.

## T3 — Fase 3: Autenticação (Clerk) — PENDENTE (próxima)
- Webhook de sincronização Clerk→`users`, login/register, perfil do usuário.
- REQUISITOS: dono confirmar a Fase 2 e criar as chaves do Clerk
  (em https://dashboard.clerk.com) para preencher o `.env`.