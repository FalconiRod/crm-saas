# CURRENT_STATE

## Onde estamos
**Fase 4 — Workspace (tenancy): CONCLUÍDA (aguardando teste do dono).**
Helper de tenancy, criação de workspace com plano, seletor multi-workspace e
isolamento verificado por script (`TENANCY_OK`). Próximo: o dono cria o primeiro
workspace na tela e confirmar para a Fase 5 (Empresas).

## O que funciona
- **Tenancy**: `core/tenancy/tenancy.ts` (withTenantContext/withTenant/
  listUserTenants/getMembership/requireMembership). RLS atualizado com
  `app.user_id` (bootstrap da sessão) — migration `20260820000300` aplicada.
- **Dashboard**: sem workspace → tela de criação (nome + plano); com workspace →
  cabeçalho (nome/plano/papel), seletor quando há mais de um, cards de
  contadores com escopo RLS. Server actions `createWorkspace`/`selectWorkspace`
  com cookie `active_tenant`.
- Login Clerk testado (usuário "Rodrigo Paulo" em `users`); build OK.
- Banco: 5 migrations aplicadas; RLS verificado (app_user sem BYPASSRLS);
  `prisma migrate status`: up to date.

## O que falta / atenção
- DONO: criar o primeiro workspace na tela (http://localhost:3000/dashboard).
- Webhook do Clerk ainda opcional (updates/deletes futuros de perfil).
- Inspecionar 3 vulnerabilidades high do `npm audit`.
- Fase 5 implementa Empresas (CRUD de crm_companies) usando o tenancy.

## Próximo passo
Fase 5 — Empresas: CRUD de `crm_companies` (listar/criar/editar/apagar) dentro
do workspace, com plano `maxCompaniesPerAccount` (INDIVIDUAL=1, TEAM=1,
AGENCY=ilimitado). **Aguardar confirmação do dono.**