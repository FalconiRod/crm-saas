-- ============================================================
-- CRM TASKS (Fase 11 — módulo de Tarefas)
-- ============================================================
-- POR QUÊ: "lembrar de ligar pro cliente amanhã" é uma das funcionalidades
-- mais usadas de um CRM. A tarefa pertence a um tenant, pode ser vinculada a
-- um contato e/ou lead (mesma política de onDelete do restante do CRM) e tem
-- responsável (assignee) opcional + data de vencimento (due_at).
--
-- SEGURANÇA: tabela de tenant com RLS FORCE + policy "tenant_isolation" única
-- (mesmo padrão de crm_companies/crm_contacts/crm_leads): a linha só é visível
-- e editável quando o tenant ativo da sessão (app.tenant_id) bate com o dela.
-- Os privilégios de DML para o papel app_user são herdados automaticamente
-- via ALTER DEFAULT PRIVILEGES (ver scripts/grant_app_user.sql).

CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'DONE');

CREATE TABLE "crm_tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "due_at" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "contact_id" TEXT,
    "lead_id" TEXT,
    "assignee_id" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "crm_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_tasks_tenant_id_status_idx" ON "crm_tasks"("tenant_id", "status");
CREATE INDEX "crm_tasks_tenant_id_due_at_idx" ON "crm_tasks"("tenant_id", "due_at");
CREATE INDEX "crm_tasks_tenant_id_assignee_id_idx" ON "crm_tasks"("tenant_id", "assignee_id");
CREATE INDEX "crm_tasks_tenant_id_contact_id_idx" ON "crm_tasks"("tenant_id", "contact_id");
CREATE INDEX "crm_tasks_tenant_id_lead_id_idx" ON "crm_tasks"("tenant_id", "lead_id");
CREATE INDEX "crm_tasks_tenant_id_idx" ON "crm_tasks"("tenant_id");

ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "crm_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_assignee_id_fkey"
  FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "crm_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "crm_tasks" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "crm_tasks"
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), ''));