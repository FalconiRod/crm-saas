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