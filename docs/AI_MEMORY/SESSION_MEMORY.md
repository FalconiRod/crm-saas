# SESSION_MEMORY

_2026-08-19 — Fase 1: Setup do projeto_

## Feito
- `create-next-app` (Next 16.3.1, React 19.2.8, TS, Tailwind 4) em `D:\PROJETOS\crm-saas`.
- Prisma 7.9.1: init, validate e generate OK (client em `app/generated/prisma`).
- Estrutura completa + READMEs + `packages/shared` com tipos base + alias `@shared/*`.
- `.env`/`.env.example`/`.gitignore` ajustados; metadata do app.
- Memória persistente criada; backup + repo GitHub privado + push.

## Decisões desta sessão
- Clerk (auth), Neon (banco), Vercel (deploy), nome provisório `crm-saas`.
  (Detalhes em DECISIONS_MEMORY.)

## Descobertas / problemas
- `npm` bloqueado no PowerShell → usar `npm.cmd`.
- Prisma 7 mudou formato (config.ts + gerador prisma-client).
- npm allow-scripts bloqueou postinstall de @prisma/engines — validate/generate OK mesmo assim.
- 3 vulnerabilidades high no `npm audit` (a inspecionar).

## Pendências
- DATABASE_URL real (Neon) para a Fase 2.
- Aguardando confirmação do dono para avançar à Fase 2.

---

# SESSÃO — 2026-08-20 — Fase 2: RLS verificado (SMOKE_OK)

## Feito
- 3 migrations APLICADAS no Neon (`prisma migrate deploy` OK; status up to date).
- DESCOBERTA: `neondb_owner` tem `BYPASSRLS=true` → RLS ignorado mesmo com FORCE
  (era o motivo do vazamento). Criado papel `app_user` sem BYPASSRLS com
  privilégios mínimos + default privileges; `APP_DATABASE_URL` criada no `.env`.
- `lib/prisma.ts` passou a usar `APP_DATABASE_URL`; instalados
  `@prisma/adapter-pg`, `pg`, `@types/pg`, `tsx`.
- `scripts/verify_db.ts` reescrito → `SMOKE_OK` (planos, create/read, isolamento,
  fail-closed REAL, cleanup). Scripts de debug removidos. Banco limpo no fim.

## Decisões desta sessão
- App conecta com papel `app_user`; dono fica só para migrations.
  (Detalhes em DECISIONS_MEMORY D6.)

## Descobertas / problemas
- BYPASSRLS do dono ignora RLS mesmo com FORCE (causa do vazamento).
- Falso positivo em teste RLS: bloqueio por FK vs por RLS — teste só vale com
  tenant existente.
- `dotenv` trata linha que começa com `#` como comentário até o fim — `Add-Content`
  anexou `APP_DATABASE_URL` na mesma linha de um comentário e ela foi ignorada
  (corrigido colocando em linha própria).
- esbuild/tsx: top-level await exige ESM (`.mts`) — envolver em `main()` async.

## Pendências
- Reportar fim da Fase 2 ao dono; aguardar confirmação antes da Fase 3 (Clerk).
- Inspecionar 3 vulnerabilidades high do `npm audit`.

---

# SESSÃO — 2026-08-20 — Fase 3: Clerk integrado

## Feito
- Instalado `@clerk/nextjs@7.7.9` + `svix`. Chaves do dono preenchidas no `.env`.
- `lib/clerk.ts` (guarda `clerkEnabled`), `proxy.ts` (Next 16 renomeou middleware
  → proxy), `ClerkProvider` condicional no layout.
- Páginas: `/` (landing dinâmica), `/sign-in`, `/sign-up`, `/dashboard`
  (protegida). Webhook `/api/webhooks/clerk` (upsert de `users` por
  `authProviderId`, delete tratado com try/catch por FK).
- Testes: build OK; produção → `/` 200, `/sign-in` 200, `/dashboard` 307→/sign-in.

## Decisões desta sessão
- Modo "configuração": sem as 2 chaves, o app renderiza instruções em vez de
  quebrar (permite build/deploy sem segredos). (D7.)

## Descobertas / problemas
- Next 16: middleware virou `proxy.ts` (funcionalidade igual, novo nome).
- Clerk v7: `UserButton` NÃO aceita `afterSignOutUrl` (vai no ClerkProvider/env
  `NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL`).
- `verifyWebhook` (Svix) exige `NextRequest` (RequestLike), não `Request` cru.
- `clerkMiddleware()` retorna `NextMiddleware`; tipar variável como tal para
  evitar o `ReturnType` pegar overload errado.

## Pendências
- DONO: criar webhook no painel do Clerk (/api/webhooks/clerk, eventos
  user.*) e colar `CLERK_WEBHOOK_SIGNING_SECRET`; testar primeiro cadastro.
- Aguardar confirmação para a Fase 4 (tenancy + workspace).

---

# SESSÃO — 2026-08-20 — Fase 3: teste real do dono + ajustes

## Feito
- Dono cadastrou e logou (rodpaul.rp@gmail.com) — usuário gravado em `users`.
- Rotas de auth viram catch-all (`/sign-in/[[...rest]]`) — fix do warning do Clerk.
- `lib/user-sync.ts` (upsertUserFromClerk) usado pelo painel E pelo webhook:
  painel sincroniza o usuário da sessão (não depende mais do webhook).
- Build + tsc OK; dev server relançado em localhost:3000 (PID 27080).

## Decisões desta sessão
- D9: sync resiliente de `users` (painel + webhook, helper único).

## Descobertas / problemas
- `next build` e `next dev` compartilham `.next`; rodar tsc com dev ativo pode
  pegar artefatos stale (`validator.ts` referenciando páginas antigas) — reiniciar
  o dev regenera. Para validar tipos com servidor ativo, rodar build/tsc após
  parar o dev.
- Start-Process de servidor de longa duração via shell do opencode: o tool mata
  o processo no timeout, mas o servidor sobrevive (fica em background).

## Pendências
- Opcional: configurar webhook real no Clerk (para updates/deletes futuros).
- Aguardar confirmação para a Fase 4 (tenancy + workspace).

---

# SESSÃO — 2026-08-20 — Fase 4: Tenancy + workspace

## Feito
- Migration `20260820000300_tenancy_session` (app.user_id no RLS de
  tenant_users/tenants; WITH CHECK fecha auto-add) aplicada no Neon.
- `core/tenancy/tenancy.ts` com withTenantContext/withTenant/listUserTenants/
  getMembership/requireMembership.
- Server actions createWorkspace/selectWorkspace (cookie active_tenant);
  dashboard com criação/seleção de workspace e contadores RLS.
- `scripts/verify_tenancy.ts` → TENANCY_OK (cria workspace, isola entre
  usuários, cleanup).

## Decisões desta sessão
- Bootstrap da sessão via `app.user_id` (id local em users) nas policies —
  resolve o problema "como listar meu tenant se o RLS exige saber o tenant".
- `tenant_id` gerado ANTES da criação (randomUUID) para o WITH CHECK
  `id = app.tenant_id` permitir o INSERT do tenant.
- Workspace ativo guardado em cookie httpOnly `active_tenant` (default: 1º).

## Descobertas / problemas
- `randomUUID` (node:crypto) funciona como id de tenant (coluna é String).
- `Prisma.TransactionClient` exportado no namespace `Prisma` do client gerado.
- Nested `$transaction` não é permitido — os loops de limpeza devem criar
  transações separadas.

## Pendências
- DONO criar o primeiro workspace na tela.
- Aguardar confirmação para a Fase 5 (Empresas).

---

# SESSÃO — 2026-08-20 — Fase 5: Empresas (CRUD de crm_companies)

## Feito
- Migration `20260820000400_crm_company_fields` (cnpj, city) aplicada.
- `lib/session.ts` (getServerUser/getSessionWorkspace/requireWorkspaceAccess);
  dashboard e dashboard/actions refatorados para usar.
- `crm/companies/actions.ts` (create/update/delete + limite do plano + RLS +
  domain_event); página `/companies`; CompanyForm + DeleteCompany (client).
- Link "Empresas" no cabeçalho do dashboard.
- `scripts/verify_companies.ts` → COMPANIES_OK.

## Decisões desta sessão
- Camada de sessão compartilhada em `lib/session.ts` (evita duplicar auth +
  resolução de workspace em cada página/action).
- Edição de empresa via query `?edit=id` (renderizada no servidor) em vez de
  estado no client — mais simples e sem estado duplicado.
- Erros de server action exibidos no formulário (useTransition + catch), sem
  depender do error boundary.
- Limite de plano validado com contagem dentro do contexto RLS (mesmo critério
  da UI: `companies.length`).

## Descobertas / problemas
- Prisma `@db.Decimal` e arrays `String[]` existem para fases futuras.
- Server actions não podem ser importadas em scripts tsx (usam cookies/next) —
  teste de dados é feito pelas primitivas (withTenant + PLAN_LIMITS).

## Pendências
- DONO testar /companies e confirmar Fase 6.
- Aguardar confirmação para a Fase 6 (Contatos).

---

# SESSÃO — 2026-08-20 — Fase 6: Contatos + limite de 5 empresas

## Feito
- Migration `20260820000500_plan_limits` (max_contacts; limite de empresas 5
  para INDIVIDUAL/TEAM no banco).
- Limite de empresas agora lido do plano no banco (enforcement + tela).
- `crm/contacts/actions.ts` (create/update/delete + vínculo de empresa validado
  + tags + origem + RLS + domain_event); página `/contacts` com busca;
  ContactForm + DeleteContact (client).
- Link "Contatos" no cabeçalho do dashboard (nav Empresas | Contatos).
- `scripts/verify_contacts.ts` → CONTACTS_OK.

## Decisões desta sessão
- Fonte da verdade dos limites = plano no BANCO (maxCompaniesPerAccount/
  maxContacts), não mais o `PLAN_LIMITS` fixo do código — evita divergência
  quando o plano mudar.
- `max_contacts` adicionado já com default ilimitado (null) para todos os
  planos — pronto para cobrança futura, sem mudança de comportamento agora.
- Busca de contatos feita no servidor (searchParams q) — simples e sem estado
  no client.

## Descobertas / problemas
- Campo `tags` é `String[]` no Prisma — chega do form como texto separado por
  vírgula e é convertido na action (parseTags).
- O dev server precisa de restart após alterar o schema (Turbopack guarda o
  client antigo em cache — 2ª ocorrência na sessão).

## Pendências
- DONO testar /contacts e confirmar Fase 7.
- Aguardar confirmação para a Fase 7 (Leads/Pipeline).

---

# SESSÃO — 2026-08-20 — Fase 7: Leads/Pipeline (kanban)

## Feito
- Migration `20260820000600_lead_limits` (max_leads).
- `crm/leads/actions.ts` (create/update/updateLeadStage/delete + contato
  obrigatório validado + valor BR + probabilidade + RLS + domain_event).
- `/leads` com kanban por estágio, badge de ganhos, formulário de criação/
  edição; LeadForm + LeadCardControls (client).
- Link "Leads" no cabeçalho do dashboard.
- `scripts/verify_leads.ts` → LEADS_OK.

## Decisões desta sessão
- Kanban sem drag-and-drop (complexidade): mover estágio via <select> no card
  (server action `updateLeadStage`). Simples, acessível e suficiente no MVP.
- Valor do lead aceito em formato BR (1.500,00 / 1500,00) e normalizado na
  action (parseValue) antes de gravar como Decimal.
- Dono do lead = usuário que criou (ownerUserId), pronto para time na Fase 9.

## Descobertas / problemas
- Prisma.Decimal precisa ser convertido para string (toString) antes de passar
  para componentes client (não serializa).
- Novo padrão de campo de plano (max_leads) mantém a uniformidade com
  maxCompaniesPerAccount/maxContacts — fonte da verdade no banco.

## Pendências
- DONO testar /leads e confirmar Fase 8.
- Aguardar confirmação para a Fase 8 (Dashboard/Relatórios).

---

# SESSÃO — 2026-08-20 — Fase 8: Dashboard/Relatórios

## Feito
- Painel com cartões (Empresas/Contatos/Leads/Ganhos/Conversão), funil em
  barras por estágio, leads recentes e filtro de período (?p=7/30/90/tudo).
- `scripts/verify_dashboard.ts` → DASHBOARD_OK.

## Decisões desta sessão
- Métricas calculadas no servidor a partir dos dados do tenant (RLS), sem
  agregações SQL complexas no MVP (volume baixo). Se crescer, partir para
  agregação no banco.
- Filtro de período via searchParams (sem estado no client); leads recentes
  sempre dos últimos 5 independentes do filtro.

## Descobertas / problemas
- Nenhuma mudança de schema nesta fase (só página + shared).

## Pendências
- DONO testar /dashboard e confirmar Fase 9.
- Aguardar confirmação para a Fase 9 (Times/Papéis).