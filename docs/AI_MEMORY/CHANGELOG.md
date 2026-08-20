# CHANGELOG

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