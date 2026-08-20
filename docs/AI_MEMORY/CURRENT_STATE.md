# CURRENT_STATE

## Onde estamos
**Fase 2 — Banco de dados: CONCLUÍDA (aguardando confirmação do dono).**
Schema completo, 3 migrations APLICADAS no Neon, RLS **verificado de verdade**
(smoke test `SMOKE_OK` com o papel `app_user`). Falta reportar ao dono e, após
confirmação, partir para a Fase 3 (Clerk).

## O que funciona
- Projeto Next.js 16 + TS + Tailwind roda (`npm run dev`).
- Prisma 7: schema validado; migrations `init`, `add_row_level_security`,
  `seed_plans` **aplicadas** no Neon (`prisma migrate status`: up to date).
- **Isolamento multi-tenant via RLS funcionando**: conexão da app usa papel
  `app_user` (sem BYPASSRLS); teste `npx tsx scripts/verify_db.ts` passa todos os
  cenários (leitura dentro do tenant, outro tenant vê 0, INSERT sem tenant bloqueado).
- Estrutura `/core`, `/crm`, `/prisma`, `/packages/shared`, `/microapps` + memória.

## O que falta / atenção
- Reportar o fim da Fase 2 ao dono (o que foi feito, como testar, arquivos) e
  aguardar confirmação antes da Fase 3 (Clerk).
- Inspecionar as 3 vulnerabilidades high do `npm audit` (a inspecionar).
- Deploy final: definir `APP_DATABASE_URL` (app_user) e `DATABASE_URL` (dono)
  como secrets na Vercel/Cloudflare (nunca no código).

## Próximo passo
Fase 3 — Autenticação com Clerk: rota webhook de sincronização
Clerk→`users`, login/register, perfil. **Aguardar confirmação do dono.**