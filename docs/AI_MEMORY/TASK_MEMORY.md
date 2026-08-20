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

## T4 — Fase 4: Tenancy + workspace — CONCLUÍDA (2026-08-20)
- Helper `core/tenancy/tenancy.ts`; migration `20260820000300` (app.user_id para
  bootstrap); server actions createWorkspace/selectWorkspace; dashboard com
  criação/seleção de workspace; verify_tenancy.ts → TENANCY_OK.
- PENDÊNCIAS: dono criar o primeiro workspace na tela.

## T5 — Fase 5: Empresas (crm_companies) — CONCLUÍDA E TESTADA (2026-08-20)
- Migration `20260820000400` (cnpj, city); actions create/update/delete com
  limite de plano + RLS + auditoria; página `/companies` (lista/criar/editar/
  excluir); `verify_companies.ts` → COMPANIES_OK. Dono cadastrou 1 empresa e o
  limite bloqueou a 2ª.

## T6 — Fase 6: Contatos (crm_contacts) — CONCLUÍDA (2026-08-20)
- Migration `20260820000500_plan_limits` (max_contacts + limite de empresas=5
  no banco); actions create/update/delete com vínculo de empresa validado, tags,
  origem, RLS e auditoria; página `/contacts` com busca; `verify_contacts.ts` →
  CONTACTS_OK.
- PENDÊNCIAS: dono testar na tela.

## T7 — Fase 7: Leads/Pipeline (crm_leads) — CONCLUÍDA (2026-08-20)
- Migration `20260820000600_lead_limits` (max_leads); actions create/update/
  moveStage/delete com contato obrigatório validado, valor/probabilidade, RLS e
  auditoria; kanban por estágio em `/leads`; `verify_leads.ts` → LEADS_OK.
- PENDÊNCIAS: dono testar na tela.

## T8 — Fase 8: Dashboard/Relatórios — CONCLUÍDA (2026-08-20)
- Painel com cartões (Empresas/Contatos/Leads/Ganhos/Conversão), funil por
  estágio em barras, leads recentes e filtro 7/30/90/tudo; métricas RLS-scoped.
- `verify_dashboard.ts` → DASHBOARD_OK.
- PENDÊNCIAS: dono testar na tela.

## T9 — Fase 9: Times/Papéis — CONCLUÍDA (2026-08-20)
- Migration `20260820000700_invitations` (tabela + RLS com app.user_email);
  `core/permissions/access.ts`; requireWorkspaceAccess(permission);
  acceptPendingInvitations no bootstrap; team page/actions; permissões nas 10
  actions de CRM + UI condicionada; `verify_team.ts` → TEAM_OK.
- PENDÊNCIAS: dono testar na tela (2ª conta para convite).

## T10 — Fase 10: Finalização — PENDENTE (próxima)
- Revisão geral (UX, segurança, quality), corrigir pendências, documentação
  final e preparação para deploy.
- REQUISITOS: dono confirmar a Fase 9.