# BUG_MEMORY

_Problema / sintoma / causa / arquivos / solução / status. Resolvidos NÃO são apagados._

## B1 — Permissões trocadas nas actions de CRM (USER podia excluir)
- DATA: 2026-08-20 (descoberto na auditoria da Fase 10)
- SINTOMA: `deleteCompany` exigia `company.update`, `updateCompany` exigia
  `company.delete` (mesmo swap em contacts/leads; `updateLeadStage` usava
  `lead.update` em vez de `lead.move`). Resultado: USER conseguia EXCLUIR mas
  NÃO conseguia editar — o oposto do pretendido.
- CAUSA: cópia errada do nome da permissão ao escrever as actions.
- ARQUIVOS: crm/companies/actions.ts, crm/contacts/actions.ts, crm/leads/actions.ts.
- SOLUÇÃO: alinhar cada action à permissão correta
  (update→`x.update`, delete→`x.delete`, mover→`lead.move`).
- STATUS: RESOLVIDO (revisado via grep + verify_team.ts asserta `can()`).

## B2 — Smoke test `verify_companies` desatualizado (limite 1→5)
- DATA: 2026-08-20
- SINTOMA: `verify_companies.ts` falhava ("limite não bloqueou a 2ª empresa").
- CAUSA: o teste assumia limite=1 (Fase 5); na Fase 6 o limite virou 5 e o
  script nunca foi reexecutado. A asserção contava 1 empresa e comparava com
  limite 5.
- ARQUIVOS: scripts/verify_companies.ts.
- SOLUÇÃO: teste agora preenche até o limite e verifica o bloqueio pela regra.
- STATUS: RESOLVIDO (COMPANIES_OK).

## B3 — Fallback do Prisma para a URL do dono (BYPASSRLS)
- DATA: 2026-08-20
- SINTOMA: se `APP_DATABASE_URL` faltasse, `lib/prisma.ts` caía para
  `DATABASE_URL` (dono com BYPASSRLS) → isolamento multi-tenant sumiria
  silenciosamente.
- ARQUIVOS: lib/prisma.ts.
- SOLUÇÃO: fail-fast (lança erro no boot sem a variável).
- STATUS: RESOLVIDO.