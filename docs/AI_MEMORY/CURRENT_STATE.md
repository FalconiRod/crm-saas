# CURRENT_STATE

## Onde estamos
**Fase 8 — Dashboard/Relatórios: IMPLEMENTADA, aguardando teste do dono.**
Painel com cartões (Empresas/Contatos/Leads/Ganhos/Conversão), funil por estágio
em barras, leads recentes e filtro de período (7/30/90 dias/tudo). Métricas
verificadas por script (`DASHBOARD_OK`). Próximo: o dono testar /dashboard e
confirmar para a Fase 9 (Times/Papéis).

## O que funciona
- **Dashboard**: métricas reais com escopo RLS do tenant ativo; funil visual;
  ganhos = soma dos leads GANHO; conversão = GANHO/total; leads recentes;
  filtro de período via `?p=`.
- Fases 1–7 seguem funcionando (auth, tenancy, workspaces, empresas, contatos,
  leads/kanban).

## O que falta / atenção
- DONO: testar o painel em http://localhost:3000/dashboard e confirmar Fase 9.
- Webhook do Clerk ainda opcional.
- Inspecionar 3 vulnerabilidades high do `npm audit`.
- Renomear/excluir workspace ainda não existe (não é bloqueio).

## Próximo passo
Fase 9 — Times/Papéis: convidar membros para o workspace com papéis
(OWNER/ADMIN/MANAGER/USER/VIEWER), respeitando `maxUsers` do plano, com permissões
por papel (quem pode criar/editar/apagar). **Aguardar confirmação do dono.**