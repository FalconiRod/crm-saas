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