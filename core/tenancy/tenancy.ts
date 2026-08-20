import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

// ============================================================
// core/tenancy — MULTI-TENANCY (pasta mais importante do projeto)
// ============================================================
// TODO fluxo de dados de tenant passa por aqui. Dentro de uma transação, a
// sessão define `app.tenant_id` (e, quando necessário, `app.user_id`) via
// set_config. As policies de RLS (migrations 20260820000100 e
// 20260820000300) só liberam as linhas do tenant da sessão — o banco é a
// segunda camada de isolamento (a primeira é o filtro por tenant_id nos
// helpers abaixo).
//
// IMPORTANTE:
//  • `users` e `plans` NÃO têm tenant_id — podem ser lidos sem contexto.
//  • Toda query em tabela "de tenant" (crm_*, domain_events, tenant_users,
//    tenants) deve rodar dentro de `withTenantContext`.
//  • Nunca escrever query "crua" sem esse helper (regra do projeto).

export type TxClient = Prisma.TransactionClient;

/**
 * Executa `fn` dentro de uma transação com o contexto de sessão definido.
 * - `tenantId`: define `app.tenant_id` (filtra as tabelas de tenant).
 * - `userId`:   define `app.user_id` (permite listar os PRÓPRIOS vínculos —
 *               usado no bootstrap da sessão e no seletor de workspace).
 */
export async function withTenantContext<T>(
  opts: { tenantId?: string; userId?: string },
  fn: (tx: TxClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    if (opts.tenantId) {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${opts.tenantId}, true)`;
    }
    if (opts.userId) {
      await tx.$executeRaw`SELECT set_config('app.user_id', ${opts.userId}, true)`;
    }
    return fn(tx);
  });
}

/** Versão curta: define apenas o tenant ativo. */
export function withTenant<T>(tenantId: string, fn: (tx: TxClient) => Promise<T>): Promise<T> {
  return withTenantContext({ tenantId }, fn);
}

/**
 * Lista os tenants do usuário (com papel, nome e plano) — bootstrap da sessão.
 * Usa apenas `app.user_id`: a policy de tenant_users libera os PRÓPRIOS vínculos
 * e a policy de tenants libera os tenants aos quais o usuário pertence.
 */
export async function listUserTenants(userId: string) {
  const memberships = await withTenantContext({ userId }, (tx) =>
    tx.tenantUser.findMany({
      where: { userId },
      include: { tenant: { include: { plan: true } } },
    })
  );
  return memberships.sort(
    (a, b) => b.tenant.createdAt.getTime() - a.tenant.createdAt.getTime()
  );
}

/**
 * Verifica se o usuário é membro do tenant e devolve o vínculo (com papel).
 * Retorna `null` se não pertencer. Toda operação "dentro do tenant" deve
 * começar com esta checagem (autorização sempre no servidor).
 */
export async function getMembership(userId: string, tenantId: string) {
  return withTenantContext({ userId, tenantId }, (tx) =>
    tx.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    })
  );
}

/**
 * Exige que o usuário seja membro do tenant; retorna o papel. Lança erro
 * (403) caso contrário. Use no começo de rotas/actions que operam num tenant.
 */
export async function requireMembership(userId: string, tenantId: string) {
  const membership = await getMembership(userId, tenantId);
  if (!membership) {
    const error = new Error("Você não tem acesso a essa empresa.");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
  return membership;
}