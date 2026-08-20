-- ============================================================
-- HARDEN RLS + ÍNDICES (Fase 10 — auditoria)
-- ============================================================
-- POR QUÊ: a auditoria (Fase 10) encontrou que as policies "tenant_isolation"
-- de tenants/tenant_users/invitations NÃO tinham cláusula FOR — valiam para
-- QUALQUER comando. Isso permitia (em teoria, sem o bloqueio do app):
--   • QUALQUER membro (inclusive VIEWER) apagar/alterar o tenant;
--   • um membro se auto-promover a OWNER (ou mudar o papel de outros);
--   • o convidado alterar o próprio convite (trocar papel/status) — escalada.
-- Aqui trocamos por policies SEPARADAS por comando, com as regras corretas:
--   SELECT  → membro do tenant / dono da linha (bootstrap);
--   INSERT  → só o próprio usuário e com papel vindo de convite PENDING
--             (ou o 1º OWNER na criação do workspace);
--   UPDATE  → só OWNER/ADMIN do tenant;
--   DELETE  → só OWNER/ADMIN do tenant (tenants: só OWNER).
-- Também adicionamos os índices que faltavam (consultas comuns + cascades).

-- 1) tenants -------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON "tenants";

CREATE POLICY "tenant_isolation_select" ON "tenants" FOR SELECT TO PUBLIC
USING (
  id = nullif(current_setting('app.tenant_id', true), '')
  OR id IN (
    SELECT tenant_id FROM tenant_users
    WHERE user_id = nullif(current_setting('app.user_id', true), '')
  )
);

CREATE POLICY "tenant_isolation_insert" ON "tenants" FOR INSERT TO PUBLIC
WITH CHECK (id = nullif(current_setting('app.tenant_id', true), ''));

-- Alterar/excluir o workspace: SOMENTE o dono (OWNER).
CREATE POLICY "tenant_isolation_update" ON "tenants" FOR UPDATE TO PUBLIC
USING (
  id = nullif(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM tenant_users a
    WHERE a.tenant_id = tenants.id
      AND a.user_id = nullif(current_setting('app.user_id', true), '')
      AND a.role = 'OWNER'
  )
)
WITH CHECK (id = nullif(current_setting('app.tenant_id', true), ''));

CREATE POLICY "tenant_isolation_delete" ON "tenants" FOR DELETE TO PUBLIC
USING (
  id = nullif(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM tenant_users a
    WHERE a.tenant_id = tenants.id
      AND a.user_id = nullif(current_setting('app.user_id', true), '')
      AND a.role = 'OWNER'
  )
);

-- 2) tenant_users ---------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON "tenant_users";

CREATE POLICY "tenant_isolation_select" ON "tenant_users" FOR SELECT TO PUBLIC
USING (
  tenant_id = nullif(current_setting('app.tenant_id', true), '')
  OR user_id = nullif(current_setting('app.user_id', true), '')
);

-- Criação de vínculo: só o PRÓPRIO usuário, e o papel precisa vir de um
-- convite PENDING para o e-mail dele (aceite automático). Exceção: o 1º OWNER
-- na criação do workspace (nenhum vínculo existe ainda naquela transação).
CREATE POLICY "tenant_isolation_insert" ON "tenant_users" FOR INSERT TO PUBLIC
WITH CHECK (
  tenant_id = nullif(current_setting('app.tenant_id', true), '')
  AND user_id = nullif(current_setting('app.user_id', true), '')
  AND (
    role = (
      SELECT i.role FROM invitations i
      WHERE i.tenant_id = tenant_users.tenant_id
        AND i.email = (SELECT email FROM users WHERE id = nullif(current_setting('app.user_id', true), ''))
        AND i.status = 'PENDING'
      LIMIT 1
    )
    OR (
      role = 'OWNER'
      AND NOT EXISTS (
        SELECT 1 FROM tenant_users x WHERE x.tenant_id = tenant_users.tenant_id
      )
    )
  )
);

-- Mudança de papel: somente OWNER/ADMIN do tenant (bloqueia auto-escalada).
CREATE POLICY "tenant_isolation_update" ON "tenant_users" FOR UPDATE TO PUBLIC
USING (
  tenant_id = nullif(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM tenant_users a
    WHERE a.tenant_id = tenant_users.tenant_id
      AND a.user_id = nullif(current_setting('app.user_id', true), '')
      AND a.role IN ('OWNER', 'ADMIN')
  )
)
WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), ''));

-- Remoção de membro: somente OWNER/ADMIN do tenant.
CREATE POLICY "tenant_isolation_delete" ON "tenant_users" FOR DELETE TO PUBLIC
USING (
  tenant_id = nullif(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM tenant_users a
    WHERE a.tenant_id = tenant_users.tenant_id
      AND a.user_id = nullif(current_setting('app.user_id', true), '')
      AND a.role IN ('OWNER', 'ADMIN')
  )
);

-- 3) invitations ----------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation" ON "invitations";

-- Leitura: membros do tenant OU o próprio convidado (pelo e-mail) — aceite.
CREATE POLICY "tenant_isolation_select" ON "invitations" FOR SELECT TO PUBLIC
USING (
  tenant_id = nullif(current_setting('app.tenant_id', true), '')
  OR email = nullif(current_setting('app.user_email', true), '')
);

-- Criação (convidar): somente OWNER/ADMIN do tenant.
CREATE POLICY "tenant_isolation_insert" ON "invitations" FOR INSERT TO PUBLIC
WITH CHECK (
  tenant_id = nullif(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM tenant_users a
    WHERE a.tenant_id = nullif(current_setting('app.tenant_id', true), '')
      AND a.user_id = nullif(current_setting('app.user_id', true), '')
      AND a.role IN ('OWNER', 'ADMIN')
  )
);

-- Alteração (ex.: revogar): somente OWNER/ADMIN. O convidado NÃO consegue
-- mexer no próprio convite (sem escalada de papel/status).
CREATE POLICY "tenant_isolation_update" ON "invitations" FOR UPDATE TO PUBLIC
USING (
  tenant_id = nullif(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM tenant_users a
    WHERE a.tenant_id = invitations.tenant_id
      AND a.user_id = nullif(current_setting('app.user_id', true), '')
      AND a.role IN ('OWNER', 'ADMIN')
  )
)
WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), ''));

CREATE POLICY "tenant_isolation_delete" ON "invitations" FOR DELETE TO PUBLIC
USING (
  tenant_id = nullif(current_setting('app.tenant_id', true), '')
  AND EXISTS (
    SELECT 1 FROM tenant_users a
    WHERE a.tenant_id = invitations.tenant_id
      AND a.user_id = nullif(current_setting('app.user_id', true), '')
      AND a.role IN ('OWNER', 'ADMIN')
  )
);

-- 4) Índices que faltavam (consultas comuns + cascades) ---------
CREATE INDEX "tenant_users_user_id_idx" ON "tenant_users"("user_id");
CREATE INDEX "crm_contacts_tenant_id_crm_company_id_idx" ON "crm_contacts"("tenant_id", "crm_company_id");
DROP INDEX IF EXISTS "crm_leads_stage_idx";
CREATE INDEX "crm_leads_tenant_id_stage_idx" ON "crm_leads"("tenant_id", "stage");
CREATE INDEX "crm_leads_tenant_id_contact_id_idx" ON "crm_leads"("tenant_id", "contact_id");
CREATE INDEX "crm_leads_tenant_id_owner_user_id_idx" ON "crm_leads"("tenant_id", "owner_user_id");
CREATE INDEX "invitations_email_status_idx" ON "invitations"("email", "status");