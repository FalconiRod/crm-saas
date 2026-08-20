# DECISIONS_MEMORY

Formato: DECISÃO / DATA / MOTIVO / CONTEXTO / ALTERNATIVAS / IMPACTO / STATUS

## D1 — Autenticação: Clerk
- DATA: 2026-08-19
- MOTIVO: serviço gerenciado que cuida de login/cadastro/Google sem guardarmos
  senhas; integração de 1 linha no Next.js; painel de gestão pronto. Menos risco
  de segurança e menos manutenção para um dono não-técnico.
- CONTEXTO: briefing pediu "Clerk ou Supabase Auth — escolha e justifique".
- ALTERNATIVAS: Supabase Auth (mais setup manual no Next.js; só se quiser unir
  auth+banco num painel só).
- IMPACTO: `users` guarda `auth_provider_id` (id do usuário no Clerk); webhook
  sincroniza Clerk→nosso banco na Fase 3.
- STATUS: DECIDIDO (integração só na Fase 3; trocável antes dela).

## D2 — Banco de dados: Neon (Postgres gerenciado)
- DATA: 2026-08-19
- MOTIVO: Postgres na nuvem com plano grátis, integração de primeira com Prisma e
  Vercel; sem instalar nada no PC do dono. RLS funciona via `set_config` em transação.
- CONTEXTO: briefing pediu "Neon ou Supabase — explique qual e por quê".
- ALTERNATIVAS: Supabase Postgres (mesmo painel de auth, mas menos natural com Prisma).
- IMPACTO: `DATABASE_URL` do Neon no `.env`; deploy final na Vercel.
- STATUS: DECIDIDO.

## D3 — Hospedagem: Vercel
- DATA: 2026-08-19
- MOTIVO: frontend+API no mesmo lugar, deploy automático do GitHub, padrão Next.js.
- ALTERNATIVAS: self-hosted (complexo demais para 1 pessoa).
- IMPACTO: integração com Neon e Clerk nativas.
- STATUS: DECIDIDO.

## D4 — Nome provisório do projeto: "crm-saas"
- DATA: 2026-08-19
- MOTIVO: o nome final está "a definir" pelo dono; "crm-saas" é descritivo e fácil
  de trocar depois (rename de pasta + repo).
- IMPACTO: baixo — nome de pasta/repo/package; não afeta o produto em si.
- STATUS: PROVISÓRIO (trocar quando o dono definir o nome).

## D5 — Prisma 7 (novo formato)
- DATA: 2026-08-19
- MOTIVO: `create-next-app`+npm instalaram Prisma 7.9.1; a v7 mudou o formato:
  gerador `prisma-client` (TS gerado em `app/generated/prisma`, gitignored) e
  `prisma.config.ts` com a URL do datasource (não mais no schema).
- IMPACTO: imports do client vêm de `@/app/generated/prisma/client`; `dotenv` é
  devDependency (usado pelo `prisma.config.ts`).
- STATUS: CONFIRMADO no validate/generate.

## D6 — Papel dedicado `app_user` (sem BYPASSRLS) para a aplicação
- DATA: 2026-08-20
- MOTIVO: o dono do banco no Neon (`neondb_owner`) tem `BYPASSRLS=true`, que
  **ignora o RLS mesmo com `FORCE ROW LEVEL SECURITY`** — o teste de isolamento
  vazou dados entre tenants por isso. Criado `app_user` (LOGIN, sem BYPASSRLS)
  com USAGE no schema + SELECT/INSERT/UPDATE/DELETE em tabelas/sequences +
  default privileges (tabelas futuras). Migrations continuam com o dono.
- CONTEXTO: duas URLs — `DATABASE_URL` (dono, migrations, via prisma.config.ts)
  e `APP_DATABASE_URL` (app_user, runtime, via lib/prisma.ts).
- ALTERNATIVAS: remover BYPASSRLS do dono (não é possível no Neon); tabelas com
  triggers/views de segurança (mais complexo); aceitar vazamento (inaceitável).
- IMPACTO: isolamento multi-tenant garantido de verdade (SMOKE_OK); conexão da
  app com menor privilégio = mais seguro.
- STATUS: DECIDIDO e VERIFICADO.