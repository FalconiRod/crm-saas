# CURRENT_STATE

## Onde estamos
**Fase 11 — Operacional (LGPD + CI + Sentry): CONCLUÍDA.**
Todas as 10 fases + Tarefas + lote operacional (LGPD, CI, Sentry) implementados
e verificados. Falta o DONO testar /privacy, /terms, /tasks e confirmar.

## O que funciona
- **LGPD**: `/privacy` (Política de Privacidade) e `/terms` (Termos de Uso)
  públicas, com conteúdo PT-BR (operadora/controladora, direitos, exclusão,
  segurança, contato). Links no rodapé da landing.
- **CI**: workflow GitHub Actions (lint + build + `verify_*` com Postgres
  service container + migrations + grant_app_user.sql). Roda em push/PR a master.
- **Sentry**: `@sentry/nextjs` configurado (client/server/edge + instrumentation);
  `withSentryConfig` condicional (só roda se `SENTRY_AUTH_TOKEN` presente) —
  build passa sem DSN. Variáveis em `.env.example`.
- **`/tasks`**: criar/editar/concluir/excluir, vínculos, responsável, vencimento,
  filtro, badge atraso, permissões + RLS.
- **Auditoria/RLS/Hardening**: todas as fases anteriores intactas.
- **Regressão**: todos `verify_*` passando + build + lint limpos.

## O que falta / atenção
- DONO: testar /privacy, /terms, /tasks na tela e confirmar finalização.
- Pendências: e-mail de convite (Resend), billing real, nome do produto,
  webhook Clerk opcional, deploy.
- `npm audit`: 3 high no toolchain do Prisma CLI (risco aceito).

## Próximo passo
1. DONO testar /privacy, /terms, /tasks e dar retorno.
2. Decidir nome do produto, configurar Sentry (DSN/token), ativar CI e deploy.