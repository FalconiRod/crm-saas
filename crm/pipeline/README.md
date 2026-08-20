# crm/pipeline — Pipeline de vendas

Estágios fixos do pipeline (MVP):

```
NOVO → CONTATO → INTERESSADO → PROPOSTA → NEGOCIAÇÃO → GANHO / PERDIDO
```

No MVP é um Kanban simples com esses estágios. Os estágios ficam definidos em
`packages/shared` (tipos TS) e o schema do banco aceita qualquer um deles.

**Quando implementar:** Fase 5 (visualização do pipeline). Nada de código aqui ainda.