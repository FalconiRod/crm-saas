# DECISIONS_MEMORY

Formato: DECISÃO / DATA / MOTIVO / CONTEXTO / ALTERNATIVAS / IMPACTO / STATUS

## D1 — Autenticação: Clerk
- DATA: 2026-08-19
- MOTIVO: serviço gerenciado que cuida de login/cadastro/Google sem guardarmos
  senhas; integração de 1 linha no Next.js; painel de gestão pronto. Menos risco
  de segurança e menos manutenção para um dono não-técnico.
- CONTEXTO: briefing pediu "Clerk ou Supabase Auth — escolha e justifique".
- ALTERNATIVAS: Supabase Auth (mais setup manual no Next.js; só se quiser unir
  auth+banco num painel só).
- IMPACTO: `users` guarda `auth_provider_id` (id do usuário no Clerk); webhook
  sincroniza Clerk→nosso banco na Fase 3.
- STATUS: DECIDIDO (integração só na Fase 3; trocável antes dela).

## D2 — Banco de dados: Neon (Postgres gerenciado)
- DATA: 2026-08-19
- MOTIVO: Postgres na nuvem com plano grátis, integração de primeira com Prisma e
  Vercel; sem instalar nada no PC do dono. RLS funciona via `set_config` em transação.
- CONTEXTO: briefing pediu "Neon ou Supabase — explique qual e por quê".
- ALTERNATIVAS: Supabase Postgres (mesmo painel de auth, mas menos natural com Prisma).
- IMPACTO: `DATABASE_URL` do Neon no `.env`; deploy final na Vercel.
- STATUS: DECIDIDO.

## D3 — Hospedagem: Vercel
- DATA: 2026-08-19
- MOTIVO: frontend+API no mesmo lugar, deploy automático do GitHub, padrão Next.js.
- ALTERNATIVAS: self-hosted (complexo demais para 1 pessoa).
- IMPACTO: integração com Neon e Clerk nativas.
- STATUS: DECIDIDO.

## D4 — Nome provisório do projeto: "crm-saas"
- DATA: 2026-08-19
- MOTIVO: o nome final está "a definir" pelo dono; "crm-saas" é descritivo e fácil
  de trocar depois (rename de pasta + repo).
- IMPACTO: baixo — nome de pasta/repo/package; não afeta o produto em si.
- STATUS: PROVISÓRIO (trocar quando o dono definir o nome).

## D5 — Prisma 7 (novo formato)
- DATA: 2026-08-19
- MOTIVO: `create-next-app`+npm instalaram Prisma 7.9.1; a v7 mudou o formato:
  gerador `prisma-client` (TS gerado em `app/generated/prisma`, gitignored) e
  `prisma.config.ts` com a URL do datasource (não mais no schema).
- IMPACTO: imports do client vêm de `@/app/generated/prisma/client`; `dotenv` é
  devDependency (usado pelo `prisma.config.ts`).
- STATUS: CONFIRMADO no validate/generate.

## D7 — Modo "configuração" do Clerk (app não quebra sem chaves)
- DATA: 2026-08-20
- MOTIVO: o build/deploy e o dev devem funcionar mesmo antes de o dono colar as
  chaves. `lib/clerk.ts` expõe `clerkEnabled` (as 2 chaves presentes) e o app
  mostra uma tela de instruções quando desabilitado, em vez de falhar.
- CONTEXTO: layout (ClerkProvider condicional), proxy.ts (clerkMiddleware ou
  pass-through), páginas de auth (mostram SetupRequired).
- ALTERNATIVAS: exigir chaves sempre (quebra o build sem segredos); keyless mode
  do Clerk (dependente de auto-provisionamento).
- IMPACTO: fluxo simples para o dono; build CI sem segredos.
- STATUS: DECIDIDO e TESTADO.

## D10 — Bootstrap da sessão via `app.user_id` nas policies de RLS
- DATA: 2026-08-20
- MOTIVO: usuário precisa listar os próprios tenants para escolher o workspace,
  mas o RLS original exigia saber o tenant antes (problema bootstrap). A policy
  de tenant_users/tenants passou a aceitar "linha do tenant ativo **OU**
  vínculo do usuário da sessão" (`app.user_id` = id local em `users`). O
  `WITH CHECK` de tenant_users mantém `tenant_id = app.tenant_id` — ninguém se
  auto-adiciona a tenant alheio. Dados de CRM continuam 100% por `app.tenant_id`.
- CONTEXTO: migration `20260820000300_tenancy_session`.
- IMPACTO: login → listar workspaces → escolher → acessar dados, tudo com RLS.
- STATUS: DECIDIDO e TESTADO (TENANCY_OK).

## D12 — Sessão compartilhada em `lib/session.ts`
- DATA: 2026-08-20
- MOTIVO: auth (Clerk) + resolução do workspace ativo (cookie) eram duplicados
  em cada página/action. Concentrar em `getServerUser`/`getSessionWorkspace`/
  `requireWorkspaceAccess` para um único caminho, reduzir divergência e facilitar
  as fases seguintes.
- IMPACTO: dashboard, dashboard/actions e crm/companies/actions usam o mesmo
  código; próximas fases herdam o padrão.
- STATUS: DECIDIDO.

## D14 — Limites de plano lidos do banco (não mais fixos no código)
- DATA: 2026-08-20
- MOTIVO: ao mudar o limite de empresas para 5, o valor existia em dois lugares
  (PLAN_LIMITS no código e max_companies_per_account no banco). Passamos a ler
  do banco (plano do tenant) tanto no enforcement quanto na UI; `PLAN_LIMITS`
  fica apenas como definição/seed inicial. Adicionado `max_contacts` (null =
  ilimitado por ora).
- IMPACTO: mudar limites = UPDATE no banco + seed, sem deploy de código.
- STATUS: DECIDIDO.

## D13 — CRUD de CRM via server actions + RLS, com limite validado no servidor
- DATA: 2026-08-20
- MOTIVO: autorização sempre no servidor. Cada action: `requireWorkspaceAccess`
  (membership) → conta dentro do contexto RLS → insere/atualiza/apaga →
  domain_event de auditoria → `revalidatePath`.
- IMPACTO: nenhuma query de CRM fora do tenancy; limite do plano impossível de
  burlar pelo client.
- STATUS: DECIDIDO e TESTADO (COMPANIES_OK).

## D11 — Workspace ativo em cookie httpOnly `active_tenant`
- DATA: 2026-08-20
- MOTIVO: lembrar qual workspace o usuário está usando entre páginas, sem
  depender de estado global. Default = 1º vínculo. Troca via server action que
  valida a assinatura (membership) antes de sobrescrever.
- CONTEXTO: `app/dashboard/actions.ts` (createWorkspace/selectWorkspace).
- IMPACTO: simplicidade no MVP; migrar para DB/clerk-org se escalar.
- STATUS: DECIDIDO.

## D9 — Sincronização de `users` resiliente: painel + webhook
- DATA: 2026-08-20
- MOTIVO: sem webhook configurado, `users` ficava vazia mesmo com login OK
  (Clerk guarda o usuário, nosso banco não). O dashboard agora faz
  `upsertUserFromClerk` (idempotente) a partir da sessão, então o fluxo
  funciona de imediato; o webhook segue sendo o sync canônico para
  atualizações/exclusões futuras. Helper único `lib/user-sync.ts` evita
  duplicação webhook↔painel.
- CONTEXTO: `auth_provider_id` é a chave única do Clerk em `users`.
- IMPACTO: Fase 4 (workspace/tenancy) não depende da configuração do webhook.
- STATUS: DECIDIDO e TESTADO (usuário real gravado).

## D8 — Webhook Clerk→banco usa `authProviderId` como chave única
- DATA: 2026-08-20
- MOTIVO: o `users.id` local é cuid (nosso); o id do Clerk fica em
  `authProviderId` (unique nullable). O webhook faz `upsert` por essa coluna,
  então primeiro login cria e mudanças de perfil atualizam sem duplicar.
- CONTEXTO: eventos `user.created`, `user.updated`, `user.deleted`;
  `verifyWebhook` (Svix) valida a assinatura em toda requisição.
- IMPACTO: `users` sempre espelha o Clerk; exclusão com FK (tenant_users etc.)
  falha com try/catch e fica registrada no log (MVP).
- STATUS: DECIDIDO e IMPLEMENTADO (aguarda webhook real do dono).

## D6 — Papel dedicado `app_user` (sem BYPASSRLS) para a aplicação
- DATA: 2026-08-20
- MOTIVO: o dono do banco no Neon (`neondb_owner`) tem `BYPASSRLS=true`, que
  **ignora o RLS mesmo com `FORCE ROW LEVEL SECURITY`** — o teste de isolamento
  vazou dados entre tenants por isso. Criado `app_user` (LOGIN, sem BYPASSRLS)
  com USAGE no schema + SELECT/INSERT/UPDATE/DELETE em tabelas/sequences +
  default privileges (tabelas futuras). Migrations continuam com o dono.
- CONTEXTO: duas URLs — `DATABASE_URL` (dono, migrations, via prisma.config.ts)
  e `APP_DATABASE_URL` (app_user, runtime, via lib/prisma.ts).
- ALTERNATIVAS: remover BYPASSRLS do dono (não é possível no Neon); tabelas com
  triggers/views de segurança (mais complexo); aceitar vazamento (inaceitável).
- IMPACTO: isolamento multi-tenant garantido de verdade (SMOKE_OK); conexão da
  app com menor privilégio = mais seguro.
- STATUS: DECIDIDO e VERIFICADO.

## D15 — Convites por e-mail com aceite automático (sem token/e-mail enviado)
- DATA: 2026-08-20
- MOTIVO: MVP sem provedor de e-mail (Resend etc.). O convidado lê o convite
  pelo e-mail do Clerk (`app.user_email`) e, ao logar, o bootstrap
  (`acceptPendingInvitations`) cria o vínculo com o papel do convite.
- ALTERNATIVAS: enviar e-mail real (Resend) — registrado como melhoria futura.
- IMPACTO: convite é "silencioso" até a pessoa logar; dono aceitou.
- STATUS: DECIDIDO e TESTADO (TEAM_OK).

## D16 — Matriz de permissões explícita por papel (core/permissions/access.ts)
- DATA: 2026-08-20
- MOTIVO: auditar "quem pode o quê" por papel de forma direta; checagem
  centralizada em `requireWorkspaceAccess(permission)` no servidor + UI
  condicionada ao papel. Papel OWNER único e protegido (não muda/remove).
- IMPACTO: qualquer nova action declara a permissão que exige; fica impossível
  esquecer a checagem por padrão.
- STATUS: DECIDIDO e TESTADO.

## D17 — Workspace novo sempre no plano INDIVIDUAL (até existir pagamento)
- DATA: 2026-08-20
- MOTIVO: o seletor de plano no createWorkspace confiava no cliente — qualquer
  um poderia pedir AGENCY e ganhar limites maiores de graça. Sem billing, o
  plano vem SEMPRE do servidor (INDIVIDUAL).
- ALTERNATIVAS: aceitar plano do cliente (falha de "entitlement"); billing real.
- IMPACTO: criação de workspace sem escolha de plano (UI simplificada).
- STATUS: DECIDIDO.

## D18 — RLS por comando nas tabelas de segurança (Fase 10)
- DATA: 2026-08-20
- MOTIVO: as policies originais (sem FOR) deixavam QUALQUER membro atualizar/
  excluir o tenant, se auto-promover a OWNER e o convidado alterar o próprio
  convite. Passamos a policies separadas por comando: SELECT p/ membros,
  INSERT p/ o próprio usuário com papel vindo de convite, UPDATE/DELETE p/
  OWNER/ADMIN. O aceite passou a NÃO marcar ACCEPTED (estado derivado do
  vínculo) para o convidado não precisar de escrita em invitations.
- CONTEXTO: migration `20260820000800_harden_rls_and_indexes`.
- IMPACTO: defesa em profundidade real; testes HARDENING_OK.
- STATUS: DECIDIDO e TESTADO.

## D19 — Falha rápida sem APP_DATABASE_URL (nunca usar a URL do dono em runtime)
- DATA: 2026-08-20
- MOTIVO: `lib/prisma.ts` tinha fallback para `DATABASE_URL` (dono, BYPASSRLS) —
  se faltasse a variável, o isolamento sumiria em silêncio. Agora o boot quebra
  com mensagem clara.
- STATUS: DECIDIDO.

## D20 — Aceite de convite não é atômico em dois passos: derivado do vínculo
- DATA: 2026-08-20
- MOTIVO: o fluxo antigo criava o vínculo e DEPOIS marcava o convite ACCEPTED em
  transações separadas (janela de inconsistência + exigia escrita do convidado
  em invitations, o que abria tamper). Agora: cria o vínculo (1 transação) e o
  status "Aceito" é derivado da existência do membro na página de Equipe.
- STATUS: DECIDIDO e TESTADO.

## D21 — Vínculos cruzados entre tenants são bloqueados na CAMADA DO APP
- DATA: 2026-08-20
- MOTIVO: ao criar Tarefas descobrimos que a checagem de FOREIGN KEY no Postgres
  IGNORA o RLS — um INSERT em crm_tasks com `contact_id` de outro tenant passava
  (a FK só verifica a existência do registro). O RLS protege a linha em si, mas
  não o referenciamento cruzado. Por isso todo vínculo (contato/lead/empresa/
  responsável) é validado ANTES pela action (`validateTargets`/`validateAssignee`),
  que faz `findUnique` dentro do tenant ativo — o RLS devolve NULL e o app
  recusa. Mesmo padrão já existia em empresas/contatos (validateCompany).
- ALTERNATIVAS: triggers de segurança no banco (mais complexo; as tables já
  cobrem o caso no app).
- IMPACTO: regra registrada — novo vínculo FK entre tabelas de tenant DEVE ter
  validação na action (não confiar só na FK/RLS).
- STATUS: DECIDIDO e TESTADO (verify_tasks).

## D22 — Sentry configurado com build condicional (sem DSN = no-op)
- DATA: 2026-08-20
- MOTIVO: adicionar monitoramento de erro em produção (plano grátis generoso do
  Sentry) sem quebrar o build local/CI sem DSN. A SDK no-op se DSN ausente.
- CONTEXTO: `@sentry/nextjs` instalado; 4 arquivos de config + `instrumentation.ts`;
  `next.config.ts` usa `withSentryConfig` condicional (só aplica se
  `SENTRY_AUTH_TOKEN` + org + project presentes). Upload de sourcemaps só com token.
- ALTERNATIVAS: inicializar Sentry só no servidor (menos cobertura); Logtail/Datadog.
- IMPACTO: build limpo sem segredos; monitoramento ativo ao configurar DSN.
- STATUS: DECIDIDO e TESTADO (build + lint OK sem DSN).

## D23 — CI no GitHub Actions com Postgres service container
- DATA: 2026-08-20
- MOTIVO: garantir que alterações futuras não quebrem o isolamento (RLS) nem o
  build/lint. O workflow roda `lint-and-build` (rápido, sem DB) e `db-tests`
  (Postgres 16 container → migrations deploy → grant_app_user.sql → todos
  `verify_*` + build). Roda em push/PR para master.
- CONTEXTO: usa `DATABASE_URL` (dono) e `APP_DATABASE_URL` (app_user) no container;
  `scripts/grant_app_user.sql` idempotente cria papel `app_user` e seta senha.
- ALTERNATIVAS: apenas lint+build (não testa RLS); Neon branch efêmero via API.
- IMPACTO: proteção real do isolamento a cada push; feedback rápido.
- STATUS: DECIDIDO; workflow criado (precisa testar no GitHub Actions real).

## D24 — LGPD: documentos públicos (Política + Termos) com links no rodapé
- DATA: 2026-08-20
- MOTIVO: bloqueante legal para vender B2B; plataformas são operadoras,
  tenants são controladores. Documentos PT-BR cobrindo: dados processados,
  base legal, compartilhamento, retenção/exclusão, segurança, contato.
- CONTEXTO: páginas `/privacy` e `/terms` (estáticas, sem auth) via
  `publicRoutes` no `clerkMiddleware`; links no rodapé da landing (`app/page.tsx`).
- ALTERNATIVAS: documentos só no dashboard (menos acessíveis); termo genérico.
- IMPACTO: conformidade básica LGPD; base para futuros DPA/contratos.
- STATUS: DECIDIDO e TESTADO (páginas 200 públicas, links no footer).