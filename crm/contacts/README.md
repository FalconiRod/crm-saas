# crm/contacts — Contatos

## O que faz
CRUD de `crm_contacts` (agenda de contatos do workspace). Cada contato pertence
a um tenant, pode ser vinculado a uma `crm_company` do MESMO workspace e tem
tags (array de texto) e origem.

## Onde fica
- `crm/contacts/actions.ts` — server actions: `createContact`, `updateContact`,
  `deleteContact`. Toda operação começa com `requireWorkspaceAccess()` e roda
  dentro de `withTenant` (RLS). O vínculo com empresa é validado dentro do
  contexto do tenant (uma empresa de outro workspace não é visível/encontrável).
- `app/contacts/page.tsx` — lista com busca por nome/e-mail/telefone
  (searchParams `q`), cadastro/edição (`?edit=id`).
- `app/contacts/ContactForm.tsx` — formulário (client): nome (obrigatório),
  telefone, e-mail, empresa (select opcional), origem, tags (vírgula → array).
- `app/contacts/DeleteContact.tsx` — exclusão com confirmação (client).

## Regras
- Vínculo com empresa: opcional e validado no mesmo workspace (RLS garante).
- Tags: texto separado por vírgula no form, armazenado como `String[]`.
- Limite por plano: `max_contacts` (null = ilimitado hoje).
- Auditoria: `contact.created/updated/deleted` em domain_events.
- Isolamento verificado por `scripts/verify_contacts.ts` (CONTACTS_OK).