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

## T3 — Fase 3: Autenticação (Clerk) — CONCLUÍDA (2026-08-20)
- ClerkProvider, proxy.ts (clerkMiddleware), páginas /sign-in, /sign-up,
  /dashboard (protegida), webhook /api/webhooks/clerk (sincroniza `users`).
- Modo "configuração": app funciona sem chaves (não quebra o build).
- PENDÊNCIAS: dono criar o webhook no Clerk e colar `CLERK_WEBHOOK_SIGNING_SECRET`;
  testar primeiro cadastro (popula `users`).

## T4 — Fase 4: Tenancy + workspace — PENDENTE (próxima)
- Criar tenant (workspace) para o usuário logado; helper de tenancy
  (`set_config('app.tenant_id', $1, true)` dentro de transação); tela de
  configuração do workspace (nome, plano).
- REQUISITOS: dono confirmar a Fase 3.