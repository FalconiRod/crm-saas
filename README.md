# CRM SaaS Multi-Tenant

_[nome provisório a definir]_

CRM completo e vendável como SaaS, que atende três tipos de cliente com o MESMO
produto (o que muda é o plano, não o código): individual/autônomo, pequena/média
empresa, e quem administra várias empresas (agência/consultor).

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript + Tailwind CSS
- **Prisma 7** + **PostgreSQL** (Neon no desenvolvimento)
- **Autenticação:** Clerk (a definir na Fase 3)
- **Hospedagem:** Vercel

## Como rodar

```bash
npm install          # instala dependências
cp .env.example .env # cria o .env (preencha a DATABASE_URL do Neon)
npm run dev          # http://localhost:3000
```

## Estrutura

```
/app                  → rotas Next.js (páginas e API routes)
/core
  /auth               → integração com o provedor de auth
  /tenancy            → resolução do tenant atual + helpers de RLS
  /permissions        → papéis e checagem de acesso
  /audit              → gravação em domain_events
/crm
  /contacts
  /leads
  /pipeline
/prisma               → schema.prisma + migrations
/packages/shared      → tipos TypeScript compartilhados
/microapps            → (vazio) módulos plugáveis futuros
/docs/AI_MEMORY       → memória persistente do projeto
```

## Segurança (inegociável)

- Toda tabela de tenant tem `tenant_id`.
- Toda query passa por filtro de `tenant_id` + Row Level Security no Postgres.
- Autorização sempre no servidor. Segredos só em variáveis de ambiente.

Mais detalhes em `docs/AI_MEMORY/`.