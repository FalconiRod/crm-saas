"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceAccess, withActiveTenant } from "@/lib/session";

// Campos opcionais comuns entre criar/editar.
function collectFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    cnpj: String(formData.get("cnpj") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

/** Limite de empresas por plano (lido do plano no banco; null = ilimitado). */
async function getPlanLimit(tenantId: string) {
  const tenant = await withActiveTenant(tenantId, (tx) =>
    tx.tenant.findUnique({ where: { id: tenantId }, include: { plan: true } })
  );
  if (!tenant) throw new Error("Empresa do workspace não encontrada.");
  return tenant.plan.maxCompaniesPerAccount;
}

/** Cria uma empresa-cliente no workspace ativo. */
export async function createCompany(formData: FormData) {
  const { userId, tenantId } = await requireWorkspaceAccess("company.create");
  const { name, cnpj, city, phone, email, notes } = collectFields(formData);
  if (!name) throw new Error("Informe o nome da empresa.");

  const limit = await getPlanLimit(tenantId);
  if (limit !== null) {
    const count = await withActiveTenant(tenantId, (tx) => tx.crmCompany.count());
    if (count >= limit)
      throw new Error(
        `Seu plano permite cadastrar até ${limit} empresa(s). Assine um plano maior ou apague uma existente.`
      );
  }

  await withActiveTenant(tenantId, async (tx) => {
    await tx.crmCompany.create({
      data: { tenantId, name, cnpj, city, phone, email, notes },
    });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "company.created", payload: { name } },
    });
  });

  revalidatePath("/companies");
}

/** Edita uma empresa-cliente do workspace ativo (verifica o vínculo). */
export async function updateCompany(formData: FormData) {
  const { userId, tenantId } = await requireWorkspaceAccess("company.update");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Empresa inválida.");
  const { name, cnpj, city, phone, email, notes } = collectFields(formData);
  if (!name) throw new Error("Informe o nome da empresa.");

  await withActiveTenant(tenantId, async (tx) => {
    const existing = await tx.crmCompany.findUnique({ where: { id } });
    if (!existing) throw new Error("Empresa não encontrada neste workspace.");
    await tx.crmCompany.update({
      where: { id },
      data: { name, cnpj, city, phone, email, notes },
    });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "company.updated", payload: { id, name } },
    });
  });

  revalidatePath("/companies");
}

/** Apaga uma empresa-cliente do workspace ativo. */
export async function deleteCompany(formData: FormData) {
  const { userId, tenantId } = await requireWorkspaceAccess("company.delete");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Empresa inválida.");

  await withActiveTenant(tenantId, async (tx) => {
    const existing = await tx.crmCompany.findUnique({ where: { id } });
    if (!existing) throw new Error("Empresa não encontrada neste workspace.");
    await tx.crmCompany.delete({ where: { id } });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "company.deleted", payload: { id } },
    });
  });

  revalidatePath("/companies");
}