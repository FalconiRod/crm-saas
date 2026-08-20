export type Role = "OWNER" | "ADMIN" | "MANAGER" | "USER" | "VIEWER";

export type PlanKey = "INDIVIDUAL" | "TEAM" | "AGENCY";

export type PipelineStage =
  | "NOVO"
  | "CONTATO"
  | "INTERESSADO"
  | "PROPOSTA"
  | "NEGOCIACAO"
  | "GANHO"
  | "PERDIDO";

/** Papéis permitidos por plano (limites aplicados no servidor). */
export const PLAN_LIMITS: Record<
  PlanKey,
  {
    maxUsers: number | null;
    maxCompaniesPerAccount: number | null;
    maxContacts: number | null;
  }
> = {
  INDIVIDUAL: { maxUsers: 1, maxCompaniesPerAccount: 5, maxContacts: null },
  TEAM: { maxUsers: 10, maxCompaniesPerAccount: 5, maxContacts: null },
  AGENCY: { maxUsers: 50, maxCompaniesPerAccount: null, maxContacts: null },
};