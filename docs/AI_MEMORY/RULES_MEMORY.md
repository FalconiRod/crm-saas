# RULES_MEMORY

_Regras descobertas ao longo do projeto. Não repetir erros._

- CONFIRMADO: no Windows o `npm` do PowerShell está bloqueado (execution policy).
  Usar `npm.cmd` / `npx.cmd` nos comandos.
- CONFIRMADO: Prisma 7 usa `prisma.config.ts` (com `import "dotenv/config"`) para a
  URL do banco; o schema não tem mais `url`. Client importado de `@/generated/prisma/client`.
- CONFIRMADO: `app/generated/prisma` é gerado pelo Prisma — está no `.gitignore`, não editar.
- CONFIRMADO: `.env*` está no gitignore; `.env.example` foi liberado via `!.env.example`.
- ATENÇÃO: npm "allow-scripts" bloqueia postinstall de alguns pacotes
  (`@prisma/engines`, `unrs-resolver`). Não impediu `prisma validate/generate`, mas
  se algum comando falhar por engine ausente, aprovar os scripts (`npm approve-scripts`).
- ATENÇÃO: `npm audit` acusou 3 vulnerabilidades high após instalar `prisma` — inspecionar
  antes da Fase 2 (podem ser do toolchain de dev e não do app).
- REGRA do produto: `tenants` ≠ `crm_companies`. Nunca misturar na mesma tabela nem
  expor um no lugar do outro.
- REGRA de segurança: toda query com `tenant_id` passa pelo helper de tenancy + RLS.
  Nunca escrever query Prisma "crua" em rota/componente sem o helper.
- CONFIRMADO (Fase 2): o papel DONO do Neon tem `BYPASSRLS=true` e **ignora RLS
  mesmo com `FORCE ROW LEVEL SECURITY`**. A aplicação SEMPRE conecta com o papel
  `app_user` (`APP_DATABASE_URL`); o dono (`DATABASE_URL`) é só para migrations.
- CONFIRMADO: `lib/prisma.ts` usa `APP_DATABASE_URL` (fallback `DATABASE_URL`).
  Nunca usar `DATABASE_URL` (dono) em código de runtime.
- CONFIRMADO: teste de RLS "fail-closed" só é válido com tenant EXISTENTE — com
  tenant inexistente o INSERT falha por FK, não por RLS (falso positivo).
- CONFIRMADO: import do client Prisma gerado é `@/app/generated/prisma/client`
  (corrigir referência antiga `@/generated/prisma/client`).