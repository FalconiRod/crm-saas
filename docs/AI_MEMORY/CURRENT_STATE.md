# CURRENT_STATE

## Onde estamos
**Fase 7 — Leads/Pipeline (crm_leads + kanban): IMPLEMENTADA, aguardando teste
do dono.** Funil em colunas por estágio, valor/probabilidade, mover lead entre
estágios, badge de ganhos. Verificado por script (`LEADS_OK`). Próximo: o dono
testar /leads e confirmar para a Fase 8 (Dashboard/relatórios).

## O que funciona
- **Leads**: página `/leads` com kanban (NOVO, CONTATO, INTERESSADO, PROPOSTA,
  NEGOCIACAO, GANHO, PERDIDO), criação/edição (contato obrigatório), mover de
  estágio no card, excluir, badge "Ganhos" (soma de valor dos GANHO). Auditoria
  por domain_event. `max_leads` no plano (ilimitado por ora).
- Fases 1–6 seguem funcionando (auth, tenancy, workspaces, empresas, contatos).

## O que falta / atenção
- DONO: testar Leads em http://localhost:3000/leads e confirmar Fase 8.
- Webhook do Clerk ainda opcional.
- Inspecionar 3 vulnerabilidades high do `npm audit`.
- Renomear/excluir workspace ainda não existe (não é bloqueio).

## Próximo passo
Fase 8 — Dashboard/Relatórios: visão geral com métricas reais do funil
(leads por estágio, ganhos, taxa de conversão, contatos/empresas) e filtros.
**Aguardar confirmação do dono.**