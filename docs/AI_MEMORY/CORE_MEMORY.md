# CORE_MEMORY

_Núcleo estável. Identidade, objetivo, tecnologias e regras fundamentais._

## O que é
CRM multi-tenant vendável como SaaS. Um produto atende: (1) individual/MEI,
(2) PME com múltiplos usuários e papéis, (3) agência/consultor com várias empresas
vinculadas à mesma conta. Dados de cada empresa (tenant) totalmente isolados.

## Tecnologias (CONFIRMADO)
- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- Prisma 7 + PostgreSQL (Neon no desenvolvimento; Vercel para deploy)
- Auth: Clerk (decidido, integrar na Fase 3)

## Regras fundamentais
- Toda tabela de tenant tem `tenant_id`; toda query filtra por ele; RLS como 2ª camada.
- Autorização sempre no servidor. Segredos só em variáveis de ambiente (backend).
- `tenants` (quem paga) ≠ `crm_companies` (empresa-cliente do CRM). Nunca misturar.
- Monolito modular. Sem microserviços/filas nesta fase.
- Usuário é 90% leigo: explicar decisões em linguagem simples, trabalhar em fases
  pequenas, não avançar fase sem confirmação, não quebrar o que funciona.

## Ambiente
- Pasta: `D:\PROJETOS\crm-saas` (nome provisório).
- Backup: `D:\PROJETOS\BACKUPS\BACKUP_CRM_SAAS_<DATA>`.
- Git: repo `FalconiRod/crm-saas` (privado). Sempre commitar/pushar ao final de etapa.