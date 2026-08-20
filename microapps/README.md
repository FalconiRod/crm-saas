# microapps — Módulos plugáveis (futuro)

Pasta **vazia de propósito**. O produto é o CRM e não existe "marketplace de
módulos" visível para o cliente. Mas a arquitetura foi pensada para que, no futuro,
novos recursos (ex.: gerador de anúncios com IA, agenda, financeiro) sejam
adicionados aqui como módulos independentes — SEM reescrever o CRM existente.

## Regras para o futuro

- Cada módulo fica em `microapps/<nome>/`, com suas rotas, componentes e helpers.
- Um módulo NUNCA toca tabelas de outro módulo (o banco continua separado por
  responsabilidade).
- Toda tabela de módulo continua com `tenant_id` + RLS (nada muda na segurança).
- NÃO implementar módulo nenhum agora. Quando você pedir, criamos o primeiro aqui
  sem tocar no que já funciona.