# crm/companies — Empresas-clientes

## O que faz
CRUD de `crm_companies` (empresas-CLIENTE do CRM — não confundir com `tenants`,
que são os assinantes do SaaS). Cada empresa pertence a um workspace e é
protegida por RLS.

## Onde fica
- `crm/companies/actions.ts` — server actions: `createCompany`, `updateCompany`,
  `deleteCompany`. Toda operação começa com `requireWorkspaceAccess()`
  (valida a assinatura do usuário no tenant ativo) e roda dentro de
  `withTenant` (RLS).
- `app/companies/page.tsx` — lista + cadastro/edição (modo `?edit=id`).
- `app/companies/CompanyForm.tsx` — formulário (client) reutilizável (criar/editar).
- `app/companies/DeleteCompany.tsx` — exclusão com confirmação (client).

## Regras
- Campos: nome (obrigatório), CNPJ, cidade, telefone, e-mail, observações
  (opcionais). Migration `20260820000400_crm_company_fields`.
- Limite por plano: `maxCompaniesPerAccount` (INDIVIDUAL=1, TEAM=1,
  AGENCY=ilimitado) validado na action — conta empresas e bloqueia com mensagem
  amigável antes de inserir.
- Auditoria: cada ação gera um `domain_event` (`company.created/updated/deleted`)
  no tenant ativo.
- Isolamento verificado por `scripts/verify_companies.ts` (COMPANIES_OK).