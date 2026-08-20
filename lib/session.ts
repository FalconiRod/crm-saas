import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { upsertUserFromClerk } from "@/lib/user-sync";
import {
  listUserTenants,
  requireMembership,
  withTenant,
  type TxClient,
} from "@/core/tenancy/tenancy";

/**
 * Usuário local autenticado (cria/atualiza a linha em `users`).
 * Lança erro se não houver sessão ativa.
 */
export async function getServerUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Você precisa estar logado.");
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Você precisa estar logado.");
  return upsertUserFromClerk({
    id: clerkUser.id,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    username: clerkUser.username,
    email: clerkUser.primaryEmailAddress?.emailAddress,
  });
}

/**
 * Resolve a sessão + workspace ativo para páginas do CRM.
 * Redireciona para /sign-in se não autenticado. `active` pode ser null quando
 * o usuário ainda não tem nenhum workspace (a página decide o que fazer).
 */
export async function getSessionWorkspace() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");
  const user = await upsertUserFromClerk({
    id: clerkUser.id,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    username: clerkUser.username,
    email: clerkUser.primaryEmailAddress?.emailAddress,
  });
  const memberships = await listUserTenants(user.id);
  const cookieStore = await cookies();
  const cookieTenant = cookieStore.get("active_tenant")?.value;
  const active = memberships.find((m) => m.tenantId === cookieTenant) ?? memberships[0];
  return { user, memberships, active };
}

/**
 * Para server actions que operam DENTRO de um workspace: valida a assinatura
 * (membership) do usuário no tenant ativo (cookie `active_tenant`) e devolve
 * o id do usuário local + tenantId.
 */
export async function requireWorkspaceAccess(): Promise<{ userId: string; tenantId: string }> {
  const user = await getServerUser();
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("active_tenant")?.value;
  if (!tenantId) throw new Error("Nenhuma empresa selecionada.");
  await requireMembership(user.id, tenantId);
  return { userId: user.id, tenantId };
}

/** Conveniência: roda uma query de CRM dentro do tenant ativo (com RLS). */
export function withActiveTenant<T>(tenantId: string, fn: (tx: TxClient) => Promise<T>) {
  return withTenant(tenantId, fn);
}