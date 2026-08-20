# CURRENT_STATE

## Onde estamos
**Fase 3 — Autenticação com Clerk: CONCLUÍDA (falta o dono configurar o webhook).**
Login/cadastro/páginas protegidas funcionando e testados. Pendência do dono:
criar o webhook no painel do Clerk e colar o `signing secret` para a tabela
`users` ser populada. Aguardando confirmação para a Fase 4 (tenancy + workspace).

## O que funciona
- Clerk ativo (chaves no `.env`): `/sign-in`, `/sign-up` renderizam o Clerk;
  `/dashboard` é protegida (sem sessão → redireciona para /sign-in).
- `proxy.ts` (antigo middleware, novo nome do Next 16) roda `clerkMiddleware()`.
- **Cadastro/login TESTADO pelo dono**: usuário "Rodrigo Paulo" gravado em
  `users` (via sync no painel — funciona sem webhook; webhook é o sync
  canônico para updates/deletes).
- Webhook `/api/webhooks/clerk` pronto (verifica assinatura; cria/atualiza/apaga
  `users`); falta apenas o `CLERK_WEBHOOK_SIGNING_SECRET` real.
- Banco: 3 migrations aplicadas; RLS verificado (`app_user` sem BYPASSRLS);
  `prisma migrate status`: up to date.
- Build de produção OK; dev rodando em localhost:3000.

## O que falta / atenção
- DONO: configurar webhook no painel do Clerk (eventos user.created/updated/
  deleted) e colar o `whsec_...` em `CLERK_WEBHOOK_SIGNING_SECRET` no `.env`.
- Testar cadastro/login de verdade (primeiro login grava o usuário em `users`).
- Inspecionar 3 vulnerabilidades high do `npm audit`.
- Deploy: chaves do Clerk + Neon como secrets no host (nunca no código).

## Próximo passo
Fase 4 — Tenancy + workspace: criar `tenant` (workspace) para o usuário logado,
helper de tenancy (`set_config('app.tenant_id')` em transação), tela de
configuração do workspace. **Aguardar confirmação do dono.**