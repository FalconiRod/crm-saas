# CURRENT_STATE

## Onde estamos
**Fase 10 — Finalização: CONCLUÍDA (auditoria + hardening + docs).**
Todo o escopo das 10 fases está implementado. Falta apenas o DONO fazer a
revisão final na tela (principalmente a nova página /settings) e decidir os
próximos passos (nome, assinaturas/billing, deploy, melhorias).

## O que funciona
- **Auditoria concluída**: permissões de CRM corrigidas (a troca update/delete
  permitia USER excluir; corrigido e coberto por teste), RLS endurecida por
  comando (só OWNER altera/exclui workspace; só OWNER/ADMIN gerem time; o
  convidado não altera o próprio convite), fail-fast sem APP_DATABASE_URL.
- **`/settings`**: renomear e excluir o workspace (só o dono, exclusão com
  confirmação digitando o nome).
- **Plano**: workspace novo sempre Individual (sem seletor enganoso).
- **Aceite de convite**: convite não é mais marcado ACCEPTED; "Aceito" é
  derivado do vínculo (página de Equipe atualizada).
- **Regressão**: todos os `verify_*` passando (inclui novo
  `verify_hardening.ts`), `npm run build` e `npm run lint` limpos.
- **Docs**: README completo, `scripts/grant_app_user.sql`, memória atualizada.

## O que falta / atenção
- DONO: revisar na tela — /settings (renomear/excluir), convite na Equipe
  (aceito vs pendente) e fluxos das telas antigas. Confirmar finalização.
- Pendências registradas (não bloqueiam): e-mail de notificação de convite
  (Resend) se desejado; billing real (assinatura libera outros planos);
  renomear nome do produto; webhook do Clerk ainda opcional.
- `npm audit`: 3 high no toolchain do Prisma CLI (risco aceito, não é runtime).

## Próximo passo
1. DONO testar a revisão final (veja lista acima).
2. Decidir nome do produto e, se quiser, ir para o deploy (Vercel ou outro) —
  o README tem as instruções.