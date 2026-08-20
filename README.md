# CRM SaaS Multi-Tenant

CRM completo e vendável como SaaS, que atende três tipos de cliente com o MESMO
produto (o que muda é o plano, não o código): individual/autônomo, pequena/média
empresa, e quem administra várias empresas (agência/consultor).

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS
- **Prisma 7** + **PostgreSQL** (Neon no desenvolvimento)
- **Autenticação:** Clerk (login/cadastro + webhook de sincronização de usuários)
- **Isolamento multi-tenant:** Row Level Security (RLS) com papel `app_user`

## O que tem (funcional)

- Workspaces (empresas do cliente do SaaS), cada um isolado por RLS.
- CRM: empresas, contatos e pipeline de leads (kanban por estágio) com limites por plano.
- Dashboard com métricas (cartões, funil, leads recentes, filtro de período).
- Times: convidar por e-mail (aceite automático ao logar), papéis
  (Dono/Administrador/Gerente/Membro/Somente leitura) e permissões por papel.
- Configurações do workspace (renomear / excluir, só o dono).
- Auditoria em `domain_events`.

## Como rodar (desenvolvimento)

```bash
npm install            # instala dependências
cp .env.example .env   # preencha as chaves reais (ver abaixo)
npm run dev            # http://localhost:3000
```

### `.env` — o que cada chave faz

| Chave | Para que serve |
|---|---|
| `DATABASE_URL` | Só **migrations** (Prisma CLI). É a URL do DONO do banco. |
| `APP_DATABASE_URL` | Runtime da aplicação, papel `app_user` (SEM BYPASSRLS) — obrigatório. |
| `NEXT_PUBLIC_CLERK_*` | Chave pública do Clerk + URLs de login/cadastro. |
| `CLERK_SECRET_KEY` | Chave secreta do Clerk (só servidor). |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Validação do webhook de sync de usuários (`whsec_...`). |

### Preparar o banco (Neon)

1. Crie o projeto e copie a connection string do dono para `DATABASE_URL`.
2. Rode as migrations:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```
3. Crie o papel `app_user` (isolamento por RLS) e conceda privilégios:
   ```bash
   psql "<DATABASE_URL>" -f scripts/grant_app_user.sql
   ```
   Defina a senha do papel (`ALTER ROLE app_user WITH PASSWORD '...';`) e monte a
   `APP_DATABASE_URL` com esse papel. **Nunca** use a URL do dono no runtime —
   o dono tem `BYPASSRLS` e ignoraria o isolamento entre tenants.

### Clerk

1. Crie a aplicação em dashboard.clerk.com → API Keys.
2. Configure o webhook para `/api/webhooks/clerk` (eventos `user.created`,
   `user.updated`, `user.deleted`) e copie o signing secret.

## Testes de fumaça (regressão)

Cada fase tem um script que valida o comportamento e o isolamento de verdade
(conecta com `APP_DATABASE_URL`, papel `app_user`, respeitando RLS):

```bash
npx tsx scripts/verify_db.ts          # RLS fail-closed + planos seed
npx tsx scripts/verify_tenancy.ts     # workspaces, isolamento, seletor
npx tsx scripts/verify_companies.ts   # empresas + limite por plano
npx tsx scripts/verify_contacts.ts    # contatos + vínculo com empresa
npx tsx scripts/verify_leads.ts       # pipeline/kanban + limites
npx tsx scripts/verify_dashboard.ts   # métricas do dashboard
npx tsx scripts/verify_team.ts        # convites, papéis, permissões
npx tsx scripts/verify_hardening.ts   # bloqueios de RLS (escalada/tamper)
```

## Checagens de qualidade

```bash
npm run build   # type check + build de produção
npm run lint    # ESLint
```

## Estrutura

```
/app                  → rotas Next.js (páginas e server actions)
/core
  /tenancy            → helper de RLS (app.tenant_id/user_id/user_email)
  /permissions        → papéis e matriz de permissões
/crm
  /companies          → ações de server das empresas
  /contacts           → ações de server dos contatos
  /leads              → ações de server do pipeline
/prisma               → schema.prisma + migrations (inclui policies de RLS)
/packages/shared      → tipos TS compartilhados (planos, pipeline, enums)
/scripts              → testes de fumaça + grant_app_user.sql
/docs/AI_MEMORY       → memória persistente do projeto (ler antes de trabalhar)
```

## Segurança (inegociável)

- Toda tabela de tenant tem `tenant_id` + RLS com `FORCE` (nem o dono pula).
- Runtime conecta com papel `app_user` (sem BYPASSRLS); `DATABASE_URL` só em migrations.
- Autorização sempre no servidor (`requireWorkspaceAccess`), com permissão por papel;
  RLS é a segunda camada (defesa em profundidade).
- Webhook do Clerk validado por assinatura (HMAC) antes de processar.
- Segredos só em variáveis de ambiente; `.env` nunca é commitado.

Mais detalhes em `docs/AI_MEMORY/`.