import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";
import { upsertUserFromClerk } from "@/lib/user-sync";
import {
  listUserTenants,
  requireMembership,
  withTenant,
  withTenantContext,
  type TxClient,
} from "@/core/tenancy/tenancy";
import type { Role } from "@shared/index";
import { requirePermission, type Permission } from "@/core/permissions/access";

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
 * Aceita convites pendentes do usuário (por e-mail) — rodado no bootstrap.
 * Se o e-mail tem convite PENDING, vira membro com o papel do convite.
 *
 * O convite NÃO é marcado ACCEPTED aqui de propósito: o convidado não tem
 * permissão de escrita em `invitations` (RLS), então quem define o estado é o
 * próprio sistema — um convite vira "Aceito" quando o membro existe (a página
 * de Equipe deriva isso do vínculo).
 */
export async function acceptPendingInvitations(user: {
  id: string;
  email: string | null;
}) {
  if (!user.email) return 0;
  const email = user.email;
  const pending = await withTenantContext({ email }, (tx) =>
    tx.invitation.findMany({
      where: { email, status: "PENDING" },
      orderBy: { createdAt: "asc" },
    })
  );
  let joined = 0;
  for (const inv of pending) {
    const done = await withTenantContext(
      { userId: user.id, tenantId: inv.tenantId, email },
      async (tx) => {
        const existing = await tx.tenantUser.findUnique({
          where: { tenantId_userId: { tenantId: inv.tenantId, userId: user.id } },
        });
        if (existing) return false;
        await tx.tenantUser.create({
          data: { tenantId: inv.tenantId, userId: user.id, role: inv.role },
        });
        await tx.domainEvent.create({
          data: {
            tenantId: inv.tenantId,
            userId: user.id,
            type: "member.joined",
            payload: { email, role: inv.role },
          },
        });
        return true;
      }
    );
    if (done) joined += 1;
  }
  return joined;
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
  await acceptPendingInvitations(user);
  const memberships = await listUserTenants(user.id);
  const cookieStore = await cookies();
  const cookieTenant = cookieStore.get("active_tenant")?.value;
  const active = memberships.find((m) => m.tenantId === cookieTenant) ?? memberships[0];
  return { user, memberships, active };
}

/**
 * Para server actions que operam DENTRO de um workspace: valida a assinatura
 * (membership) do usuário no tenant ativo (cookie `active_tenant`) e devolve
 * id do usuário local, tenantId e o PAPEL (para checagem de permissão).
 * Se `permission` for passada, exige que o papel tenha essa permissão.
 */
export async function requireWorkspaceAccess(
  permission?: Permission
): Promise<{ userId: string; tenantId: string; role: Role }> {
  const user = await getServerUser();
  const cookieStore = await cookies();
  const tenantId = cookieStore.get("active_tenant")?.value;
  if (!tenantId) throw new Error("Nenhuma empresa selecionada.");
  const membership = await requireMembership(user.id, tenantId);
  if (permission) requirePermission(membership.role, permission);
  return { userId: user.id, tenantId, role: membership.role };
}

/** Conveniência: roda uma query de CRM dentro do tenant ativo (com RLS). */
export function withActiveTenant<T>(tenantId: string, fn: (tx: TxClient) => Promise<T>) {
  return withTenant(tenantId, fn);
}