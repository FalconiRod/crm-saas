# core/tenancy — Multi-tenancy

**Pasta mais importante do projeto.** Aqui fica a resolução do tenant ativo e os
helpers de isolamento de dados.

## Regras (inegociáveis)

1. Toda tabela que pertence a um tenant tem `tenant_id`.
2. NENHUMA query toca o banco sem passar por aqui — nem dentro de `/crm`, nem em
   rota alguma. O helper injeta o filtro de `tenant_id` automaticamente.
3. Segunda camada: Row Level Security (RLS) no Postgres, aplicada na Fase 2.

## Como vai funcionar (Fase 4)

- A sessão identifica o `user_id`.
- O usuário escolhe qual tenant está ativo (no caso de plano Agência com várias
  empresas) — seletor de empresa na interface.
- Cada requisição resolve o `tenant_id` ativo e, dentro de uma transação, executa
  `SELECT set_config('app.tenant_id', $1, true)` antes das consultas. As policies
  de RLS só liberam as linhas do tenant da sessão.

**Quando implementar:** Fase 2 (RLS no banco) e Fase 4 (helper de resolução).
Nada de código aqui ainda.