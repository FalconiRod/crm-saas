# core/tenancy — Multi-tenancy

**Pasta mais importante do projeto.** Aqui fica a resolução do tenant ativo e os
helpers de isolamento de dados.

## Regras (inegociáveis)

1. Toda tabela que pertence a um tenant tem `tenant_id`.
2. NENHUMA query toca o banco sem passar por aqui — nem dentro de `/crm`, nem em
   rota alguma. O helper injeta o filtro de `tenant_id` automaticamente.
3. Segunda camada: Row Level Security (RLS) no Postgres (migrations
   `20260820000100` + `20260820000300`).

## Como funciona (implementado na Fase 4)

- `withTenantContext({ tenantId?, userId? }, fn)` — abre uma transação e define
  `app.tenant_id` e/ou `app.user_id` via `set_config` ANTES das consultas. As
  policies de RLS só liberam as linhas do tenant da sessão.
- `withTenant(tenantId, fn)` — atalho para escopo só de tenant (dados de CRM).
- `listUserTenants(userId)` — bootstrap da sessão: lista os tenants do usuário
  (com papel, nome e plano) usando apenas `app.user_id`.
- `getMembership(userId, tenantId)` / `requireMembership(...)` — verificação de
  autorização ANTES de operar num tenant (autorização sempre no servidor).

## Bootstrap da sessão (migration 20260820000300)

Problema: para o usuário entrar, ele precisa listar os tenants dele — mas o RLS
exige saber o tenant. Solução: cada sessão define também `app.user_id` (id local
em `users`, que não tem RLS). As policies de `tenant_users` e `tenants` aceitam
"linha do tenant ativo **OU** vínculo do usuário da sessão". Dados de CRM
continuam 100% fechados por `app.tenant_id`. O `WITH CHECK` de `tenant_users`
mantém `tenant_id = app.tenant_id` — ninguém se auto-adiciona a tenant alheio.

## Fluxo

- Login (Clerk) → usuário local em `users` (upsert).
- Sem workspace: tela de criação (nome + plano) → server action `createWorkspace`
  gera o `tenant_id`, cria `tenants` + `tenant_users` (OWNER) + `domain_event`
  `tenant.created`, e define o cookie `active_tenant`.
- Com workspace: `listUserTenants` → resolve o ativo (cookie `active_tenant` ou
  o primeiro) → dados com `withTenant`.
- Múltiplos workspaces: seletor no cabeçalho (`selectWorkspace` valida a
  assinatura de acesso antes de trocar o cookie).