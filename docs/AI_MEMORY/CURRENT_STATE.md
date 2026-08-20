# CURRENT_STATE

## Onde estamos
**Fase 5 — Empresas (crm_companies): CONCLUÍDA E TESTADA PELO DONO (2026-08-20).**
Dono cadastrou 1 empresa ("padaria") e o limite bloqueou a 2ª (plano Individual).
Isolamento verificado (workspace 2 com 0 empresas). Próximo: Fase 6 (Contatos) —
aguardando confirmação do dono.

## O que funciona
- **Empresas**: página `/companies` com lista, cadastro (nome + CNPJ + cidade +
  telefone + e-mail + observações), edição (`?edit=id`) e exclusão com
  confirmação. Limite do plano exibido e validado (INDIVIDUAL/TEAM=1,
  AGENCY=ilimitado). Auditoria por domain_event.
- **Sessão compartilhada**: `lib/session.ts` (`getServerUser`,
  `getSessionWorkspace`, `requireWorkspaceAccess`) usado pelo dashboard e pelas
  actions de CRM.
- Fases 1–4 seguem funcionando (auth Clerk, tenancy, workspaces).

## O que falta / atenção
- DONO: confirmar Fase 6 (Contatos) para seguir.
- Webhook do Clerk ainda opcional.
- Inspecionar 3 vulnerabilidades high do `npm audit`.
- Renomear/excluir workspace ainda não existe (não é bloqueio).

## Próximo passo
Fase 6 — Contatos: CRUD de `crm_contacts` (nome, telefone, e-mail, tags,
origem) opcionalmente vinculado a uma empresa, com limites por plano.
**Aguardar confirmação do dono.**