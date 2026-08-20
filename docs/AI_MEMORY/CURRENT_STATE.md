# CURRENT_STATE

## Onde estamos
**Fase 6 — Contatos (crm_contacts): IMPLEMENTADA, aguardando teste do dono.**
CRUD completo (nome, telefone, e-mail, tags, origem, vínculo opcional com
empresa), busca simples, limite de empresas alterado para **5** (Individual e
Team; AGENCY ilimitado). Verificado por script (`CONTACTS_OK`). Próximo: o dono
testar /contacts e confirmar para a Fase 7 (Leads/Pipeline).

## O que funciona
- **Contatos**: página `/contacts` com lista + busca, cadastro/edição/exclusão,
  vínculo com empresa do mesmo workspace, tags, origem. Auditoria por
  domain_event.
- **Limite de empresas = 5** (lido do plano no banco, não mais do código fixo):
  INDIVIDUAL e TEAM → 5, AGENCY → ilimitado. `max_contacts` adicionado ao
  plano (atualmente ilimitado para todos).
- Fases 1–5 seguem funcionando (auth, tenancy, workspaces, empresas).

## O que falta / atenção
- DONO: testar Contatos em http://localhost:3000/contacts e confirmar Fase 7.
- Webhook do Clerk ainda opcional.
- Inspecionar 3 vulnerabilidades high do `npm audit`.
- Renomear/excluir workspace ainda não existe (não é bloqueio).

## Próximo passo
Fase 7 — Leads/Pipeline: CRUD de `crm_leads` (contato, estágio NOVO→GANHO/
PERDIDO, valor, probabilidade) com kanban simples por estágio.
**Aguardar confirmação do dono.**