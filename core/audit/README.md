# core/audit — Auditoria

Grava eventos de domínio e auditoria na tabela `domain_events` (a mesma tabela
serve para os dois fins).

Exemplos de eventos:
- `lead.created`, `lead.updated`, `lead.moved`
- `contact.created`, `contact.updated`
- `company.created`

Campos: `id`, `tenant_id`, `user_id`, `type`, `payload` (jsonb), `is_audit`,
`ip`, `created_at`.

**Quando implementar:** Fase 8. Nada de código aqui ainda.