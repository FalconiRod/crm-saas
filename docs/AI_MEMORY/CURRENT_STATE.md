# CURRENT_STATE

## Onde estamos
**Fase 11 — Tarefas: CONCLUÍDA (módulo de Tarefas adicionado).**
Todas as 10 fases + o módulo de Tarefas estão implementados e verificados.
Falta o DONO testar a página /tasks na tela e decidir os próximos passos
(nome, billing, deploy, melhorias).

## O que funciona
- **Auditoria concluída**: permissões de CRM corrigidas (a troca update/delete
  permitia USER excluir; corrigido e coberto por teste), RLS endurecida por
  comando (só OWNER altera/exclui workspace; só OWNER/ADMIN gerem time; o
  convidado não altera o próprio convite), fail-fast sem APP_DATABASE_URL.
- **`/settings`**: renomear e excluir o workspace (só o dono, exclusão com
  confirmação digitando o nome).
- **`/tasks`** (novo): criar/editar/concluir/excluir tarefas, vínculo opcional
  com contato e lead, responsável, data de vencimento com badge de atraso,
  filtro Todas/Pendentes/Concluídas. Permissões por papel
  (`task.create/update/delete`) e RLS `tenant_isolation`.
- **Plano**: workspace novo sempre Individual (sem seletor enganoso).
- **Aceite de convite**: convite não é mais marcado ACCEPTED; "Aceito" é
  derivado do vínculo (página de Equipe atualizada).
- **Regressão**: todos os `verify_*` passando (inclui `verify_tasks.ts`),
  `npm run build` e `npm run lint` limpos.
- **Docs**: README, memória e `verify_tasks.ts` atualizados.

## O que falta / atenção
- DONO: testar /tasks na tela (criar, concluir, filtrar) e revisar
  /settings + Equipe (aceito vs pendente).
- Pendências registradas (não bloqueiam): e-mail de notificação de convite
  (Resend) se desejado; billing real (assinatura libera outros planos);
  renomear nome do produto; webhook do Clerk ainda opcional.
- `npm audit`: 3 high no toolchain do Prisma CLI (risco aceito, não é runtime).
- Próximas melhorias sugeridas pela análise de mercado (não implementadas):
  CI no GitHub Actions, Sentry, documentos LGPD, link WhatsApp (wa.me),
  confirmação reforçada de delete em CRM, múltiplos funis, campos customizados.

## Próximo passo
1. DONO testar /tasks na tela e dar retorno.
2. Decidir nome do produto e, se quiser, partir para CI + monitoramento + LGPD
   (proteção operacional antes de vender) — ver análise de mercado do Claude.