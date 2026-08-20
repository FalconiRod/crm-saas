# CHANGELOG

## 2026-08-20 — Fase 5: Empresas (CRUD de crm_companies)
- Migration `20260820000400_crm_company_fields` aplicada: colunas `cnpj` e
  `city` em `crm_companies`.
- `lib/session.ts` — helpers compartilhados: `getServerUser`,
  `getSessionWorkspace`, `requireWorkspaceAccess` (dashboard e actions de CRM
  usam o mesmo caminho).
- `crm/companies/actions.ts` — `createCompany`/`updateCompany`/`deleteCompany`
  com validação de plano (`maxCompaniesPerAccount`), RLS e auditoria
  (`company.created/updated/deleted`).
- `app/companies/page.tsx` — lista + formulário (criar/editar via `?edit=id`),
  uso do limite do plano, exclusão com confirmação.
- Componentes client: `CompanyForm.tsx` (criar/editar), `DeleteCompany.tsx`.
- Dashboard ganhou link "Empresas" no cabeçalho.
- `scripts/verify_companies.ts` → **COMPANIES_OK** (cria, bloqueia 2ª pelo
  limite, edita, isola entre workspaces, apaga, cleanup).

## 2026-08-20 — Fase 4: Workspace / tenancy implementado
- Migration `20260820000300_tenancy_session` aplicada no Neon: policies de
  `tenant_users` e `tenants` passam a aceitar `app.user_id` (bootstrap da
  sessão — usuário lista os próprios vínculos); `WITH CHECK` mantém
  `tenant_id = app.tenant_id` (ninguém se auto-adiciona a tenant alheio).
- `core/tenancy/tenancy.ts` — helpers `withTenantContext`, `withTenant`,
  `listUserTenants`, `getMembership`, `requireMembership` (transação +
  `set_config('app.tenant_id'/'app.user_id', $1, true)`).
- Server actions `app/dashboard/actions.ts` — `createWorkspace` (cria tenant +
  vínculo OWNER + domain_event `tenant.created` + cookie `active_tenant`) e
  `selectWorkspace` (valida acesso antes de trocar o cookie).
- `app/dashboard/page.tsx` — sem workspace: tela de criação (nome + plano);
  com workspace: cabeçalho com nome/plano/papel + seletor (multi), cards de
  contadores reais com escopo RLS (empresas/contatos/leads).
- `scripts/verify_tenancy.ts` → **TENANCY_OK** (cria, lista, isola entre
  usuários, cleanup).

## 2026-08-20 — Fase 3: ajustes pós-teste (catch-all + sync de usuário no painel)
- Rotas de auth convertidas para catch-all (`/sign-in/[[...rest]]`,
  `/sign-up/[[...rest]]`) — necessário para o fluxo interno do Clerk (antes o
  check interno retornava 404 e emitia warning).
- `lib/user-sync.ts` — helper `upsertUserFromClerk` (idempotente por
  `authProviderId`), usado pelo webhook E pelo dashboard. O painel agora
  cria/atualiza o usuário a partir da sessão do Clerk, então o app funciona
  mesmo SEM webhook configurado (o webhook continua sendo o sync canônico
  para updates/deletes futuros).
- Teste real do dono: cadastro + login OK; usuário "Rodrigo Paulo"
  (rodpaul.rp@gmail.com) gravado em `users`. Build + tsc OK.

## 2026-08-20 — Fase 3: Autenticação com Clerk integrada
- Instalados `@clerk/nextjs@7.7.9` e `svix@2.0.0`.
- `lib/clerk.ts` — guarda `clerkEnabled`: o app funciona (e builda) mesmo sem as
  chaves, mostrando uma tela de configuração (evita quebrar antes do dono
  configurar). Clerk só liga com as 2 chaves presentes.
- `proxy.ts` (Next 16: middleware agora chama-se proxy) — `clerkMiddleware()`
  quando habilitado; pass-through quando não.
- `app/layout.tsx` — `ClerkProvider` condicional (só quando habilitado).
- Páginas: `/` (landing com Entrar/Criar conta conforme sessão), `/sign-in`,
  `/sign-up` (componentes Clerk), `/dashboard` (protegida: redireciona para
  /sign-in sem sessão; mostra perfil + UserButton + módulos "Em breve").
- Webhook `app/api/webhooks/clerk/route.ts` — sincroniza Clerk→`users`
  (`user.created/updated` via upsert por `authProviderId`; `user.deleted`).
  Assinatura verificada com `verifyWebhook` (Svix).
- `.env`/`.env.example` com chaves do Clerk + URLs de redirecionamento;
  `CLERK_WEBHOOK_SIGNING_SECRET` pendente (dono precisa criar o webhook).
- Build OK; teste de produção OK (`/` 200, `/sign-in` 200, `/dashboard` 307→/sign-in).
- PENDENTE: dono configurar o webhook no painel do Clerk e colar o signing
  secret; testar cadastro/login de verdade (webhook popula `users`).

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