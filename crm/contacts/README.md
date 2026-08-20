# crm/contacts — Contatos

Empresas-cliente e contatos cadastrados pelo tenant dentro do próprio CRM.

**IMPORTANTE (não confundir):**
- `tenants` = quem paga o SaaS.
- `crm_companies` = a empresa de um contato/lead cadastrada pelo tenant dentro do CRM.

Um tenant nunca aparece como "empresa" no CRM de outro tenant (e vice-versa).

Tabelas: `crm_companies`, `crm_contacts`. Ambas com `tenant_id`.

**Quando implementar:** Fase 5 (CRUD). Nada de código aqui ainda.