"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceAccess, withActiveTenant } from "@/lib/session";

/** Tags vêm do form como texto separado por vírgula. */
function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function collectFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    crmCompanyId: String(formData.get("companyId") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    tags: parseTags(String(formData.get("tags") ?? "")),
    origin: String(formData.get("origin") ?? "").trim() || null,
  };
}

/** Limite de contatos por plano (lido do plano no banco; null = ilimitado). */
async function getPlanLimit(tenantId: string) {
  const tenant = await withActiveTenant(tenantId, (tx) =>
    tx.tenant.findUnique({ where: { id: tenantId }, include: { plan: true } })
  );
  if (!tenant) throw new Error("Empresa do workspace não encontrada.");
  return tenant.plan.maxContacts;
}

/** Valida que a empresa vinculada existe no MESMO workspace (RLS garante). */
async function validateCompany(tenantId: string, companyId: string | null) {
  if (!companyId) return null;
  const company = await withActiveTenant(tenantId, (tx) =>
    tx.crmCompany.findUnique({ where: { id: companyId } })
  );
  if (!company) throw new Error("Empresa selecionada não existe neste workspace.");
  return companyId;
}

/** Cria um contato no workspace ativo. */
export async function createContact(formData: FormData) {
  const { userId, tenantId } = await requireWorkspaceAccess();
  const { name, crmCompanyId, phone, email, tags, origin } = collectFields(formData);
  if (!name) throw new Error("Informe o nome do contato.");

  const limit = await getPlanLimit(tenantId);
  if (limit !== null) {
    const count = await withActiveTenant(tenantId, (tx) => tx.crmContact.count());
    if (count >= limit)
      throw new Error(
        `Seu plano permite cadastrar até ${limit} contato(s). Assine um plano maior ou apague alguns.`
      );
  }

  const companyId = await validateCompany(tenantId, crmCompanyId);

  await withActiveTenant(tenantId, async (tx) => {
    await tx.crmContact.create({
      data: { tenantId, name, crmCompanyId: companyId, phone, email, tags, origin },
    });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "contact.created", payload: { name } },
    });
  });

  revalidatePath("/contacts");
}

/** Edita um contato do workspace ativo. */
export async function updateContact(formData: FormData) {
  const { userId, tenantId } = await requireWorkspaceAccess();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Contato inválido.");
  const { name, crmCompanyId, phone, email, tags, origin } = collectFields(formData);
  if (!name) throw new Error("Informe o nome do contato.");

  const companyId = await validateCompany(tenantId, crmCompanyId);

  await withActiveTenant(tenantId, async (tx) => {
    const existing = await tx.crmContact.findUnique({ where: { id } });
    if (!existing) throw new Error("Contato não encontrado neste workspace.");
    await tx.crmContact.update({
      where: { id },
      data: { name, crmCompanyId: companyId, phone, email, tags, origin },
    });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "contact.updated", payload: { id, name } },
    });
  });

  revalidatePath("/contacts");
}

/** Apaga um contato do workspace ativo. */
export async function deleteContact(formData: FormData) {
  const { userId, tenantId } = await requireWorkspaceAccess();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Contato inválido.");

  await withActiveTenant(tenantId, async (tx) => {
    const existing = await tx.crmContact.findUnique({ where: { id } });
    if (!existing) throw new Error("Contato não encontrado neste workspace.");
    await tx.crmContact.delete({ where: { id } });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "contact.deleted", payload: { id } },
    });
  });

  revalidatePath("/contacts");
}