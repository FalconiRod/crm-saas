# core/permissions — Controle de acesso por papel (Fase 9)

## O que faz
Define quem pode fazer o quê em cada papel do workspace. Autorização é feita
SEMPRE no servidor, antes de qualquer operação.

## Papéis
VIEWER (somente leitura) → USER (criar/editar) → MANAGER (+ excluir) →
ADMIN (+ gerir o time) → OWNER (tudo, dono único e protegido).

## Como usar
- `can(role, "company.delete")` → boolean.
- `requirePermission(role, "member.invite")` → lança 403 se não puder.
- Na prática, `requireWorkspaceAccess("company.create")` já resolve usuário +
  tenant + papel e exige a permissão (lib/session.ts).

## Permissões
`workspace.view`, `company.create/update/delete`, `contact.create/update/delete`,
`lead.create/update/delete/move`, `member.invite/updateRole/remove`.

## Regras
- OWNER nunca é convidado/removido/rebaixado (INVITABLE_ROLES = sem OWNER).
- A UI esconde ações sem permissão, mas o bloqueio REAL está no servidor.
- Matriz explícita por papel (fácil de auditar e ajustar).