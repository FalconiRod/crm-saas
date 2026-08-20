"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireWorkspaceAccess } from "@/lib/session";
import { withTenantContext } from "@/core/tenancy/tenancy";

const ACTIVE_TENANT_COOKIE = "active_tenant";

/** Renomeia o workspace ativo (somente o dono). */
export async function renameWorkspace(formData: FormData) {
  const { userId, tenantId, role } = await requireWorkspaceAccess();
  if (role !== "OWNER") throw new Error("Somente o dono pode renomear o workspace.");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Informe o nome do workspace.");

  await withTenantContext({ userId, tenantId }, async (tx) => {
    const existing = await tx.tenant.findUnique({ where: { id: tenantId } });
    if (!existing) throw new Error("Workspace não encontrado.");
    await tx.tenant.update({ where: { id: tenantId }, data: { name } });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "tenant.renamed", payload: { name } },
    });
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

/** Exclui o workspace ativo e todos os seus dados (somente o dono). */
export async function deleteWorkspace() {
  const { tenantId, role } = await requireWorkspaceAccess();
  if (role !== "OWNER") throw new Error("Somente o dono pode excluir o workspace.");

  // A exclusão em cascata remove membros, empresas, contatos, leads e eventos.
  // O RLS só permite o DELETE quando o usuário é OWNER do tenant.
  await withTenantContext({ userId: undefined, tenantId }, async (tx) => {
    const existing = await tx.tenant.findUnique({ where: { id: tenantId } });
    if (!existing) throw new Error("Workspace não encontrado.");
    await tx.tenant.delete({ where: { id: tenantId } });
  });

  // Limpa o cookie do tenant ativo (o workspace não existe mais).
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_TENANT_COOKIE);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}