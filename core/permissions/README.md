# core/permissions — Papéis e autorização

Papéis fixos por tenant (armazenados em `tenant_users.role`):

| Papel      | O que pode                                    |
|------------|-----------------------------------------------|
| OWNER      | Tudo, incluindo gerenciar usuários e plano    |
| ADMIN      | Tudo operacional, menos excluir o tenant      |
| MANAGER    | Gerencia equipe e dados do CRM                |
| USER       | Usa o CRM normalmente                         |
| VIEWER     | Só visualiza                                  |

## Regra

Autorização (o que um usuário pode fazer) é SEMPRE verificada no servidor. Nunca
confie em papel/permissão enviado pelo cliente/frontend.

**Quando implementar:** Fase 6. Nada de código aqui ainda.