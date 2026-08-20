# CURRENT_STATE

## Onde estamos
**Fase 9 — Times/Papéis: IMPLEMENTADA, aguardando teste do dono.**
Convites por e-mail com aceite automático, papéis (OWNER/ADMIN/MANAGER/USER/
VIEWER), permissões por papel em todas as actions de CRM e UI condicionada,
limite de membros do plano. Verificado por script (`TEAM_OK`). Próximo: o dono
testar /team (criar uma 2ª conta para o aceite) e confirmar para a Fase 10.

## O que funciona
- **Equipe** (`/team`): lista de membros com papel, convite por e-mail (com
  papel, nunca OWNER), mudar papel, remover membro, revogar convite, uso do
  limite do plano (INDIVIDUAL=1, TEAM=10, AGENCY=50).
- **Aceite automático**: ao logar, quem tem convite pendente (e-mail bate) vira
  membro com o papel do convite — sem token/e-mail de confirmação.
- **Permissões** (`core/permissions/access.ts`): VIEWER lê; USER cria/edita/
  move; MANAGER + exclui; ADMIN/OWNER gerem o time. Actions exigem permissão;
  UI esconde ações sem permissão.
- Fases 1–8 seguem funcionando (auth, tenancy, workspaces, empresas, contatos,
  leads/kanban, dashboard).

## O que falta / atenção
- DONO: testar /team e confirmar Fase 10. Para testar o convite, usar um 2º
  e-mail/conta.
- Webhook do Clerk ainda opcional.
- Inspecionar 3 vulnerabilidades high do `npm audit`.
- Renomear/excluir workspace ainda não existe (não é bloqueio).

## Próximo passo
Fase 10 — Finalização: revisão geral, afinar UX, corrigir pendências, revisão
de segurança/qualidade e documentação final para deploy.