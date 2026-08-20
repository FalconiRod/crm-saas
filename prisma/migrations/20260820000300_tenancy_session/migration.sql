-- ============================================================
-- TENANCY SESSION — bootstrap da sessão multi-tenant (Fase 4)
-- ============================================================
-- POR QUÊ: para o usuário entrar no app, ele precisa (1) listar os tenants aos
-- quais pertence (tela de seleção/workspace) e (2) ver as infos desses tenants.
-- Antes, a policy só liberava linhas quando `app.tenant_id` batia — o que
-- impedia essa listagem inicial (problema "bootstrap": como descobrir meu
-- tenant se o RLS exige saber o tenant?).
--
-- SOLUÇÃO: cada sessão define TAMBÉM `app.user_id` (o id LOCAL do usuário, da
-- tabela `users`, que não tem RLS). As policies de `tenant_users` e `tenants`
-- passam a aceitar duas condições:
--   • a linha pertence ao tenant ativo (`app.tenant_id`), OU
--   • o usuário é dono daquela linha de vínculo (`app.user_id`).
-- Isso permite listar os próprios vínculos (e os tenants correspondentes) sem
-- abrir nada para usuários de fora. Os dados de CRM (crm_companies/contacts/
-- leads/domain_events) continuam 100% fechados por `app.tenant_id`.

-- tenant_users: usuário pode ler/atualizar SEUS vínculos; só pode CRIAR vínculo
-- para o tenant ativo (WITH CHECK fecha a porta: não dá para se auto-adicionar
-- a um tenant alheio).
ALTER POLICY "tenant_isolation" ON "tenant_users"
  USING (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')
    OR user_id = nullif(current_setting('app.user_id', true), '')
  )
  WITH CHECK (
    tenant_id = nullif(current_setting('app.tenant_id', true), '')
  );

-- tenants: visível quando é o ativo OU quando o usuário é membro (necessário
-- para o seletor de workspace e para o cabeçalho mostrar nome/plano). Só pode
-- ser CRIADO quando `app.tenant_id` for o próprio id (o app gera o id antes).
ALTER POLICY "tenant_isolation" ON "tenants"
  USING (
    id = nullif(current_setting('app.tenant_id', true), '')
    OR id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = nullif(current_setting('app.user_id', true), '')
    )
  )
  WITH CHECK (
    id = nullif(current_setting('app.tenant_id', true), '')
  );