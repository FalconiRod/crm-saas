# CURRENT_STATE

## Onde estamos
**Fase 5 — Empresas (crm_companies): IMPLEMENTADA, aguardando teste do dono.**
CRUD completo, limite por plano e isolamento verificados por script
(`COMPANIES_OK`). Próximo: o dono cadastrar/editar/excluir empresas na tela e
confirmar para a Fase 6 (Contatos).

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
- DONO: testar Empresas em http://localhost:3000/companies e confirmar Fase 6.
- Webhook do Clerk ainda opcional.
- Inspecionar 3 vulnerabilidades high do `npm audit`.
- Renomear/excluir workspace ainda não existe (não é bloqueio).

## Próximo passo
Fase 6 — Contatos: CRUD de `crm_contacts` (nome, telefone, e-mail, tags,
origem) opcionalmente vinculado a uma empresa, com limites por plano.
**Aguardar confirmação do dono.**