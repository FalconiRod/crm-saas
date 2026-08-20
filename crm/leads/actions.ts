"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceAccess, withActiveTenant } from "@/lib/session";
import { PIPELINE_STAGES, type PipelineStage } from "@shared/index";

/** Converte "1234,56" ou "1234.56" em número seguro. */
function parseValue(input: string): string | null {
  const cleaned = input.trim().replace(/\./g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) throw new Error("Valor inválido. Use números, ex.: 1500,00");
  return n.toFixed(2);
}

function parseProbability(input: string): number | null {
  const cleaned = input.trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isInteger(n) || n < 0 || n > 100)
    throw new Error("Probabilidade inválida. Use um número de 0 a 100.");
  return n;
}

/** Limite de leads por plano (lido do plano no banco; null = ilimitado). */
async function getPlanLimit(tenantId: string) {
  const tenant = await withActiveTenant(tenantId, (tx) =>
    tx.tenant.findUnique({ where: { id: tenantId }, include: { plan: true } })
  );
  if (!tenant) throw new Error("Empresa do workspace não encontrada.");
  return tenant.plan.maxLeads;
}

/** Valida que o contato existe no MESMO workspace (RLS garante). */
async function validateContact(tenantId: string, contactId: string) {
  const contact = await withActiveTenant(tenantId, (tx) =>
    tx.crmContact.findUnique({ where: { id: contactId } })
  );
  if (!contact) throw new Error("Contato selecionado não existe neste workspace.");
}

/** Cria um lead no workspace ativo (estágio inicial: NOVO). */
export async function createLead(formData: FormData) {
  const { userId, tenantId } = await requireWorkspaceAccess();
  const contactId = String(formData.get("contactId") ?? "").trim();
  const stage = String(formData.get("stage") ?? "NOVO") as PipelineStage;
  if (!contactId) throw new Error("Selecione um contato para o lead.");
  if (!PIPELINE_STAGES.includes(stage)) throw new Error("Estágio inválido.");

  const limit = await getPlanLimit(tenantId);
  if (limit !== null) {
    const count = await withActiveTenant(tenantId, (tx) => tx.crmLead.count());
    if (count >= limit)
      throw new Error(
        `Seu plano permite cadastrar até ${limit} lead(s). Assine um plano maior ou apague alguns.`
      );
  }

  await validateContact(tenantId, contactId);
  const value = parseValue(String(formData.get("value") ?? ""));
  const probability = parseProbability(String(formData.get("probability") ?? ""));

  await withActiveTenant(tenantId, async (tx) => {
    await tx.crmLead.create({
      data: {
        tenantId,
        contactId,
        stage,
        value,
        probability,
        origin: String(formData.get("origin") ?? "").trim() || null,
        notes: String(formData.get("notes") ?? "").trim() || null,
        ownerUserId: userId,
      },
    });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "lead.created", payload: { stage } },
    });
  });

  revalidatePath("/leads");
}

/** Edita um lead do workspace ativo. */
export async function updateLead(formData: FormData) {
  const { userId, tenantId } = await requireWorkspaceAccess();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Lead inválido.");
  const contactId = String(formData.get("contactId") ?? "").trim();
  const stage = String(formData.get("stage") ?? "NOVO") as PipelineStage;
  if (!contactId) throw new Error("Selecione um contato para o lead.");
  if (!PIPELINE_STAGES.includes(stage)) throw new Error("Estágio inválido.");

  await validateContact(tenantId, contactId);
  const value = parseValue(String(formData.get("value") ?? ""));
  const probability = parseProbability(String(formData.get("probability") ?? ""));

  await withActiveTenant(tenantId, async (tx) => {
    const existing = await tx.crmLead.findUnique({ where: { id } });
    if (!existing) throw new Error("Lead não encontrado neste workspace.");
    await tx.crmLead.update({
      where: { id },
      data: {
        contactId,
        stage,
        value,
        probability,
        origin: String(formData.get("origin") ?? "").trim() || null,
        notes: String(formData.get("notes") ?? "").trim() || null,
      },
    });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "lead.updated", payload: { id, stage } },
    });
  });

  revalidatePath("/leads");
}

/** Move um lead de estágio no kanban (mantém os demais dados). */
export async function updateLeadStage(formData: FormData) {
  const { userId, tenantId } = await requireWorkspaceAccess();
  const id = String(formData.get("id") ?? "").trim();
  const stage = String(formData.get("stage") ?? "") as PipelineStage;
  if (!id) throw new Error("Lead inválido.");
  if (!PIPELINE_STAGES.includes(stage)) throw new Error("Estágio inválido.");

  await withActiveTenant(tenantId, async (tx) => {
    const existing = await tx.crmLead.findUnique({ where: { id } });
    if (!existing) throw new Error("Lead não encontrado neste workspace.");
    await tx.crmLead.update({ where: { id }, data: { stage } });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "lead.stage_changed", payload: { id, to: stage } },
    });
  });

  revalidatePath("/leads");
}

/** Apaga um lead do workspace ativo. */
export async function deleteLead(formData: FormData) {
  const { userId, tenantId } = await requireWorkspaceAccess();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Lead inválido.");

  await withActiveTenant(tenantId, async (tx) => {
    const existing = await tx.crmLead.findUnique({ where: { id } });
    if (!existing) throw new Error("Lead não encontrado neste workspace.");
    await tx.crmLead.delete({ where: { id } });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "lead.deleted", payload: { id } },
    });
  });

  revalidatePath("/leads");
}