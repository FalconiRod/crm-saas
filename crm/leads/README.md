# crm/leads — Leads / Pipeline

## O que faz
CRUD de `crm_leads` com estágios do funil de vendas. Cada lead pertence a um
tenant, está OBRIGATORIAMENTE ligado a um `crm_contact` do mesmo workspace, tem
valor (Decimal), probabilidade, origem e observações. Dono = quem criou.

## Estágios
`PIPELINE_STAGES` (packages/shared): NOVO → CONTATO → INTERESSADO → PROPOSTA →
NEGOCIACAO → GANHO / PERDIDO.

## Onde fica
- `crm/leads/actions.ts` — server actions: `createLead`, `updateLead`,
  `updateLeadStage` (kanban), `deleteLead`. Contato obrigatório e validado
  dentro do contexto RLS; valor normalizado de formato BR; auditoria em
  domain_events.
- `app/leads/page.tsx` — funil em colunas (kanban), badge de ganhos (soma de
  GANHO), criação/edição (`?edit=id`).
- `app/leads/LeadForm.tsx` — formulário (client).
- `app/leads/LeadCardControls.tsx` — mover estágio + editar + excluir (client).

## Regras
- Contato é obrigatório e deve pertencer ao MESMO workspace.
- Valor: texto BR (`1.500,00` / `1500,00`) → normalizado para Decimal na action.
- Probabilidade: 0–100.
- Limite por plano: `max_leads` (null = ilimitado hoje).
- Auditoria: `lead.created/updated/stage_changed/deleted`.
- Isolamento verificado por `scripts/verify_leads.ts` (LEADS_OK).