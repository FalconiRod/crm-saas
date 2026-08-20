# PROJECT_MEMORY

_História, contexto de negócio, público, funcionalidades._

## Visão
CRM completo vendável como SaaS atendendo 3 perfis com o mesmo produto (muda o
plano, não o código):
1. Individual/autônomo/freelancer/MEI → 1 usuário, 1 empresa.
2. PME → 1 empresa, múltiplos usuários com papéis (OWNER/ADMIN/MANAGER/USER/VIEWER).
3. Agência/contador/consultor → 1 login, várias empresas isoladas entre si.

## Diferença crítica
- `tenants`: quem assina o SaaS (tabela `tenants`).
- `crm_companies`: empresa-cliente cadastrada PELO tenant dentro do CRM.
Nunca misturar. Um tenant não aparece como opção de "empresa" no CRM de outro.

## Pipeline (estágios fixos do MVP)
NOVO → CONTATO → INTERESSADO → PROPOSTA → NEGOCIAÇÃO → GANHO / PERDIDO

## Modelo de receita
Planos INDIVIDUAL / TEAM / AGENCY com limites (`max_users`,
`max_companies_per_account`). Sem pagamento real no MVP (mock/estrutura).

## Não implementar agora
IA, créditos, billing real, módulos plugáveis, marketplace. Apenas não fechar
portas (pasta `/microapps` documentada e vazia).

## Evolução esperada
Fases 1-10 definidas no briefing inicial. Ao final de cada fase, parar, explicar
e esperar confirmação do dono.