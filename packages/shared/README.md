# packages/shared — Tipos compartilhados

Tipos TypeScript usados pelo frontend e backend do monólito (ex.: papéis, estágios
do pipeline, limites de plano).

Importação: `import { Role } from "@shared/*"` (alias configurado no `tsconfig.json`).

No futuro, se o projeto crescer, este pacote pode virar um workspace npm real
(`@crm/shared`) sem reescrita do CRM.