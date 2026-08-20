"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceAccess, withActiveTenant } from "@/lib/session";
import { withTenantContext } from "@/core/tenancy/tenancy";
import { requirePermission, INVITABLE_ROLES } from "@/core/permissions/access";
import type { Role } from "@shared/index";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Limite de membros por plano (lido do plano no banco; null = ilimitado). */
async function getPlanLimit(tenantId: string) {
  const tenant = await withActiveTenant(tenantId, (tx) =>
    tx.tenant.findUnique({ where: { id: tenantId }, include: { plan: true } })
  );
  if (!tenant) throw new Error("Empresa do workspace não encontrada.");
  return tenant.plan.maxUsers;
}

/** Convidar um e-mail para o workspace com um papel (nunca OWNER). */
export async function inviteMember(formData: FormData) {
  const { userId, tenantId, role } = await requireWorkspaceAccess();
  requirePermission(role, "member.invite");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const invitedRole = String(formData.get("role") ?? "VIEWER") as Role;
  if (!EMAIL_RE.test(email)) throw new Error("E-mail inválido.");
  if (!INVITABLE_ROLES.includes(invitedRole)) throw new Error("Papel inválido.");

  await withTenantContext({ userId, tenantId }, async (tx) => {
    const member = await tx.tenantUser.findFirst({ where: { tenantId, user: { email } } });
    if (member) throw new Error("Esse e-mail já é membro do workspace.");

    const alreadyPending = await tx.invitation.findFirst({
      where: { tenantId, email, status: "PENDING" },
    });
    if (alreadyPending) throw new Error("Já existe um convite pendente para esse e-mail.");

    const limit = await getPlanLimit(tenantId);
    if (limit !== null) {
      const [members, pending] = await Promise.all([
        tx.tenantUser.count({ where: { tenantId } }),
        tx.invitation.count({ where: { tenantId, status: "PENDING" } }),
      ]);
      if (members + pending >= limit)
        throw new Error(
          `Seu plano permite até ${limit} membro(s). Assine um plano maior ou revogue convites pendentes.`
        );
    }

    await tx.invitation.create({
      data: { tenantId, email, role: invitedRole, invitedBy: userId },
    });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "member.invited", payload: { email, role: invitedRole } },
    });
  });

  revalidatePath("/team");
}

/** Mudar o papel de um membro (não vale para o OWNER nem para auto-rebaixar). */
export async function changeMemberRole(formData: FormData) {
  const { userId, tenantId, role } = await requireWorkspaceAccess();
  requirePermission(role, "member.updateRole");

  const targetUserId = String(formData.get("userId") ?? "").trim();
  const newRole = String(formData.get("role") ?? "") as Role;
  if (!targetUserId) throw new Error("Membro inválido.");
  if (!INVITABLE_ROLES.includes(newRole)) throw new Error("Papel inválido.");

  await withTenantContext({ userId, tenantId }, async (tx) => {
    const target = await tx.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
    });
    if (!target) throw new Error("Membro não encontrado neste workspace.");
    if (target.role === "OWNER") throw new Error("Não é possível mudar o papel do dono.");
    if (targetUserId === userId && role === "OWNER")
      throw new Error("O dono não pode rebaixar a si mesmo.");

    await tx.tenantUser.update({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
      data: { role: newRole },
    });
    await tx.domainEvent.create({
      data: {
        tenantId,
        userId,
        type: "member.role_changed",
        payload: { userId: targetUserId, from: target.role, to: newRole },
      },
    });
  });

  revalidatePath("/team");
}

/** Remover um membro do workspace (nunca o OWNER). */
export async function removeMember(formData: FormData) {
  const { userId, tenantId, role } = await requireWorkspaceAccess();
  requirePermission(role, "member.remove");

  const targetUserId = String(formData.get("userId") ?? "").trim();
  if (!targetUserId) throw new Error("Membro inválido.");

  await withTenantContext({ userId, tenantId }, async (tx) => {
    const target = await tx.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
    });
    if (!target) throw new Error("Membro não encontrado neste workspace.");
    if (target.role === "OWNER") throw new Error("Não é possível remover o dono.");

    await tx.tenantUser.delete({
      where: { tenantId_userId: { tenantId, userId: targetUserId } },
    });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "member.removed", payload: { userId: targetUserId } },
    });
  });

  revalidatePath("/team");
}

/** Revogar um convite pendente. */
export async function revokeInvitation(formData: FormData) {
  const { userId, tenantId, role } = await requireWorkspaceAccess();
  requirePermission(role, "member.remove");

  const invitationId = String(formData.get("invitationId") ?? "").trim();
  if (!invitationId) throw new Error("Convite inválido.");

  await withTenantContext({ userId, tenantId }, async (tx) => {
    const inv = await tx.invitation.findUnique({ where: { id: invitationId } });
    if (!inv) throw new Error("Convite não encontrado neste workspace.");
    await tx.invitation.update({
      where: { id: invitationId },
      data: { status: "REVOKED" },
    });
    await tx.domainEvent.create({
      data: {
        tenantId,
        userId,
        type: "member.invitation_revoked",
        payload: { email: inv.email },
      },
    });
  });

  revalidatePath("/team");
}