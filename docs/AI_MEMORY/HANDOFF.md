# HANDOFF — Resumo operacional para o próximo agente (Claude)

> Leia PRIMEIRO: `docs/AI_MEMORY/PROJECT_MEMORY.md`, `CURRENT_STATE.md`,
> `DATABASE_MEMORY.md`, `DECISIONS_MEMORY.md`, `RULES_MEMORY.md` e `CHANGELOG.md`.

## O que é o projeto
CRM SaaS multi-tenant em `D:\PROJETOS\crm-saas` (Next.js 16 + React 19 + TS +
Tailwind + Prisma 7 + Neon/Postgres + Clerk). Atende 3 perfis no mesmo produto
(individual, PME, agência) — o que muda é o plano, não o código. **Isolamento
multi-tenant é o requisito inegociável** e é garantido por RLS no Postgres.

## Estado atual
- **10 fases do briefing + Fase 11 (Operacional: LGPD, CI, Sentry) implementadas e verificadas.**
  Último commit: `d899828` (após Fase 11).
- Repo público do dono: `https://github.com/FalconiRod/crm-saas` (branch `master`).
- Tudo commitado/pushado; working tree limpo. Backup em
  `D:\PROJETOS\BACKUPS\BACKUP_CRM_SAAS_2026-08-20` (refresh na Fase 11).

## Como rodar local
```bash
npm install
cp .env.example .env   # preencher DATABASE_URL, APP_DATABASE_URL, chaves Clerk
npm run dev            # http://localhost:3000
```
- Migrations: `npx prisma migrate deploy` (dono) + `npx prisma generate`.
- Papel `app_user` (runtime, RLS): `psql "<DATABASE_URL>" -f scripts/grant_app_user.sql`.

## Segurança (entender antes de mexer)
- **Duas URLs**: `DATABASE_URL` (dono, só migrations) e `APP_DATABASE_URL`
  (`app_user`, sem BYPASSRLS, usada por `lib/prisma.ts` — que quebra no boot se
  faltar). O dono tem BYPASSRLS e ignoraria o RLS.
- **RLS por comando** (migration `20260820000800`): tenants UPDATE/DELETE só
  OWNER; tenant_users UPDATE/DELETE só OWNER/ADMIN, INSERT = próprio usuário +
  papel de convite PENDING (ou 1º OWNER na criação); invitations escrita só
  OWNER/ADMIN (o convidado só LÊ pelo próprio e-mail `app.user_email`).
- **Permissões por papel** (`core/permissions/access.ts`): VIEWER lê; USER
  cria/edita/move; MANAGER + exclui; ADMIN/OWNER gerem o time. Toda action
  começa com `requireWorkspaceAccess("<permission>")`. Nomes das permissões:
  `company.*`, `contact.*`, `lead.*` (update/delete/move), `task.*`
  (create/update/delete), `member.invite/updateRole/remove`.
- **Vínculos FK cruzados entre tenants**: FK IGNORA RLS — todo vínculo
  (contato/lead/empresa/responsável) é validado NA ACTION dentro do tenant ativo
  (`findUnique` → NULL → recusa). Novo vínculo = validar na action (D21).
- **DELETE de tenant**: exige papel OWNER (policy hardening). Testes sem OWNER
  falham (P2025); contornar com `upsert` + limpeza só de dados CRM.
- **Aceite de convite**: roda no bootstrap (`lib/session.ts`), cria o vínculo e
  NÃO marca o convite ACCEPTED (estado derivado do vínculo na página de Equipe).
  Não reintroduzir `invitation.update` no fluxo de aceite.
- Webhook do Clerk validado por assinatura (Svix) antes de processar.

## Testes de regressão (rodar após mudanças)
```bash
npx tsx scripts/verify_db.ts
npx tsx scripts/verify_tenancy.ts
npx tsx scripts/verify_companies.ts
npx tsx scripts/verify_contacts.ts
npx tsx scripts/verify_leads.ts
npx tsx scripts/verify_dashboard.ts
npx tsx scripts/verify_team.ts
npx tsx scripts/verify_hardening.ts
npx tsx scripts/verify_tasks.ts
npm run build
npm run lint
```
Obs: scripts conectam com `APP_DATABASE_URL` (RLS real). Server actions não
podem ser importadas em scripts tsx (usam next/cookies) — testes espelham a
lógica. No Windows usar `npm.cmd`/`npx.cmd`; PowerShell trata stderr do git
como erro (push OK mesmo assim); reiniciar o `next dev` após mudanças no schema.

## Pendências / próximos passos (decidir com o dono)
- DONO testar `/privacy`, `/terms`, `/tasks` na tela; revisão final de
  `/settings` e Equipe.
- Nome do produto (hoje provisório "crm-saas").
- Billing real (hoje todo workspace novo é INDIVIDUAL; outros planos são seeds).
- E-mail de notificação de convite (Resend) — hoje o convite é "silencioso".
- Deploy (README tem instruções; Vercel recomendado).
- Configurar Sentry: criar projeto, copiar DSN + `SENTRY_AUTH_TOKEN` + org/project.
- Ativar CI no GitHub Actions (workflow já existe, precisa rodar no Actions real).
- `npm audit`: 3 high em `deepmerge-ts` via Prisma CLI (toolchain de dev, risco
  aceito — correção exigiria downgrade do Prisma).
- Webhook do Clerk ainda opcional (o painel sincroniza `users` no login).

## Estrutura rápida
- `app/` — rotas/páginas: `/dashboard`, `/companies`, `/contacts`, `/leads`,
  `/tasks`, `/team`, `/settings`, `/api/webhooks/clerk`, auth do Clerk.
- `core/tenancy/tenancy.ts` — helper de RLS (app.tenant_id/user_id/user_email).
- `core/permissions/access.ts` — papéis e permissões.
- `lib/session.ts` — sessão + workspace ativo + aceite de convites.
- `crm/*/actions.ts` — server actions (com permissão + auditoria + RLS).
- `prisma/migrations/` — inclui as policies de RLS (001, 003, 007, 008, 010).
- `packages/shared/` — enums/tipos compartilhados (plans, pipeline, roles).
- `docs/AI_MEMORY/` — memória persistente do projeto (ler antes de trabalhar).