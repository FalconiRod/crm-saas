-- ============================================================
-- ROW LEVEL SECURITY — SEGUNDA CAMADA DE ISOLAMENTO DE TENANT
-- ============================================================
-- POR QUÊ: a regra nº1 do produto é "nunca deixar uma query retornar dados de
-- mais de um tenant". O filtro no código (helper de tenancy, Fase 4) é a primeira
-- camada; o RLS é a rede de segurança: mesmo que alguém escreva uma query "crua"
-- esquecendo o filtro, o banco devolve ZERO linhas de outro tenant.
--
-- COMO FUNCIONA: cada policy compara a coluna tenant_id com a variável de sessão
-- `app.tenant_id`. A aplicação define essa variável dentro de cada transação
-- (SELECT set_config('app.tenant_id', $1, true)) antes de qualquer consulta.
-- Se a variável NÃO estiver definida, a comparação dá NULL -> nenhuma linha é
-- retornada (comportamento "fail-closed": falha sem vazar dado).
--
-- FORCE ROW LEVEL SECURITY: no Neon o app conecta como o usuário DONO do banco,
-- e por padrão o dono ignora RLS. O FORCE obriga até o dono a passar pela policy,
-- senão o RLS seria letra morta. (Se no futuro o app conectar com um papel
-- separado e sem privilégios de dono, o FORCE continua sendo uma proteção extra.)

-- tenants: o "tenant_id" é o próprio id
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "tenants"
  USING (id = nullif(current_setting('app.tenant_id', true), ''));

-- vínculo usuário <-> tenant
ALTER TABLE "tenant_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_users" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "tenant_users"
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), ''));

-- empresas-cliente do CRM
ALTER TABLE "crm_companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_companies" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "crm_companies"
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), ''));

-- contatos do CRM
ALTER TABLE "crm_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_contacts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "crm_contacts"
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), ''));

-- leads do CRM
ALTER TABLE "crm_leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_leads" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "crm_leads"
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), ''));

-- eventos de domínio/auditoria
ALTER TABLE "domain_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "domain_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "domain_events"
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), ''));

-- OBSERVAÇÃO: `users` e `plans` NÃO têm tenant_id (identidade global / referência
-- global) e por isso NÃO recebem RLS nesta fase. Toda exposição de dados delas
-- será controlada no código (Fase 4/6).