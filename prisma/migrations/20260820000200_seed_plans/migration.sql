-- Planos fixos do MVP (referência global; sem RLS).
-- Preços são MOCK (estrutura sem gateway de pagamento real até a Fase 9).
-- maxUsers:            Individual=1, Team=10, Agência=50.
-- maxCompaniesPerAccount: Individual=1, Team=1, Agência=NULL (ilimitado).
INSERT INTO "plans" ("id", "key", "name", "max_users", "max_companies_per_account", "price_cents")
VALUES
  ('plan_individual', 'INDIVIDUAL', 'Individual', 1, 1, 0),
  ('plan_team',       'TEAM',       'Time',      10, 1, 9900),
  ('plan_agency',     'AGENCY',     'Agência',  50, NULL, 29900);