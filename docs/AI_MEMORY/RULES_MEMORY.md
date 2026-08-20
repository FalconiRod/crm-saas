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
- CONFIRMADO: `lib/prisma.ts` usa `APP_DATABASE_URL` e agora quebra no boot se a
  variável faltar (fail-fast). Nunca usar `DATABASE_URL` (dono) em código de runtime.
- CONFIRMADO: teste de RLS "fail-closed" só é válido com tenant EXISTENTE — com
  tenant inexistente o INSERT falha por FK, não por RLS (falso positivo).
- CONFIRMADO: import do client Prisma gerado é `@/app/generated/prisma/client`
  (corrigir referência antiga `@/generated/prisma/client`).
- CONFIRMADO (Fase 10): as permissões de cada action DEVEM espelhar o
  `core/permissions/access.ts` — update→`x.update`, delete→`x.delete`,
  mover lead→`lead.move`. Um swap update/delete já causou bug (USER excluía,
  não editava). Confira com um smoke test de `can(role, perm)`.
- CONFIRMADO (Fase 10): aceite de convite NÃO marca ACCEPTED no banco — o estado
  "Aceito" é derivado da existência do membro. Não reintroduzir `invitation.update`
  no fluxo de aceite (viola a policy de RLS de invitations).
- CONFIRMADO (Fase 10): RLS de tenants/tenant_users/invitations é POR COMANDO
  (select/insert/update/delete). Novo código que escreve nessas tabelas precisa
  respeitar: tenant_users INSERT = próprio usuário + papel do convite;
  UPDATE/DELETE = OWNER/ADMIN; invitations escrita = OWNER/ADMIN.
- ATENÇÃO: `npm audit` → 3 high em `deepmerge-ts` via `prisma` (CLI de dev,
  não o runtime). Correção exigiria downgrade quebrador do Prisma 6 → RISCO ACEITO.
- CONFIRMADO (Fase 10): plano de workspace novo vem sempre do servidor
  (INDIVIDUAL). Não aceitar `plan` vindo do cliente (entitlement).
- CONFIRMADO (Fase 10): `npm run build` e `npm run lint` devem passar antes de
  commit. Regras do lint: sem `any` explícito, sem imports sem uso; `Date.now()`
  em Server Component precisa de `eslint-disable-next-line react-hooks/purity`.