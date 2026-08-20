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

/** Papéis permitidos por plano (limites aplicados na Fase 9). */
export const PLAN_LIMITS: Record<
  PlanKey,
  { maxUsers: number | null; maxCompaniesPerAccount: number | null }
> = {
  INDIVIDUAL: { maxUsers: 1, maxCompaniesPerAccount: 1 },
  TEAM: { maxUsers: 10, maxCompaniesPerAccount: 1 },
  AGENCY: { maxUsers: 50, maxCompaniesPerAccount: null },
};