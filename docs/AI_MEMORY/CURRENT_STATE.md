# CURRENT_STATE

## Onde estamos
**Fase 1 — Setup do projeto: CONCLUÍDA.** Projeto criado e estrutura montada.
Aguardando confirmação do dono para seguir à Fase 2 (Banco de dados).

## O que funciona
- Projeto Next.js 16 + TS + Tailwind roda (`npm run dev`).
- Prisma 7 inicializado: schema válido, client gerado em `app/generated/prisma` (gitignored).
- Estrutura de pastas `/core`, `/crm`, `/prisma`, `/packages/shared`, `/microapps` + memória.

## O que falta / atenção
- `.env` precisa da `DATABASE_URL` real (Neon) antes de rodar migrations (Fase 2).
- Fase 2: schema Prisma completo + migration + RLS.
- Auth (Clerk) só na Fase 3.
- 3 vulnerabilidades high reportadas no `npm audit` (a inspecionar; podem ser do toolchain).
- npm "allow-scripts" bloqueou postinstall de `@prisma/engines`/`unrs-resolver` — não impediu validate/generate, mas vigiar.

## Próximo passo
Fase 2 — schema Prisma do MVP (tenants, plans, users, tenant_users, crm_companies,
crm_contacts, crm_leads, domain_events) + migration + policies de RLS.