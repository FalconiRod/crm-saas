"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceAccess, withActiveTenant } from "@/lib/session";

type TaskInput = {
  title: string;
  notes: string | null;
  dueAt: Date | null;
  contactId: string | null;
  leadId: string | null;
  assigneeId: string | null;
};

function collectFields(formData: FormData): TaskInput {
  const rawDue = String(formData.get("dueAt") ?? "").trim();
  const dueAt = rawDue ? new Date(rawDue) : null;
  if (rawDue && Number.isNaN(dueAt?.getTime())) throw new Error("Data de vencimento inválida.");

  return {
    title: String(formData.get("title") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim() || null,
    dueAt,
    contactId: String(formData.get("contactId") ?? "").trim() || null,
    leadId: String(formData.get("leadId") ?? "").trim() || null,
    assigneeId: String(formData.get("assigneeId") ?? "").trim() || null,
  };
}

/** Confirma que o contato/lead vinculado existe no MESMO workspace (RLS garante). */
async function validateTargets(tenantId: string, contactId: string | null, leadId: string | null) {
  if (contactId) {
    const contact = await withActiveTenant(tenantId, (tx) =>
      tx.crmContact.findUnique({ where: { id: contactId } })
    );
    if (!contact) throw new Error("Contato vinculado não existe neste workspace.");
  }
  if (leadId) {
    const lead = await withActiveTenant(tenantId, (tx) =>
      tx.crmLead.findUnique({ where: { id: leadId } })
    );
    if (!lead) throw new Error("Lead vinculado não existe neste workspace.");
  }
}

/** O responsável precisa ser membro do workspace. */
async function validateAssignee(tenantId: string, assigneeId: string | null) {
  if (!assigneeId) return;
  const member = await withActiveTenant(tenantId, (tx) =>
    tx.tenantUser.findUnique({ where: { tenantId_userId: { tenantId, userId: assigneeId } } })
  );
  if (!member) throw new Error("Responsável não é membro deste workspace.");
}

/** Cria uma tarefa no workspace ativo. */
export async function createTask(formData: FormData) {
  const { userId, tenantId } = await requireWorkspaceAccess("task.create");
  const { title, notes, dueAt, contactId, leadId, assigneeId } = collectFields(formData);
  if (!title) throw new Error("Informe o título da tarefa.");

  await validateTargets(tenantId, contactId, leadId);
  await validateAssignee(tenantId, assigneeId);

  await withActiveTenant(tenantId, async (tx) => {
    await tx.crmTask.create({
      data: {
        tenantId,
        title,
        notes,
        dueAt,
        contactId,
        leadId,
        assigneeId,
        createdById: userId,
      },
    });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "task.created", payload: { title } },
    });
  });

  revalidatePath("/tasks");
}

/** Edita os dados de uma tarefa do workspace ativo. */
export async function updateTask(formData: FormData) {
  const { userId, tenantId } = await requireWorkspaceAccess("task.update");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Tarefa inválida.");
  const { title, notes, dueAt, contactId, leadId, assigneeId } = collectFields(formData);
  if (!title) throw new Error("Informe o título da tarefa.");

  await validateTargets(tenantId, contactId, leadId);
  await validateAssignee(tenantId, assigneeId);

  await withActiveTenant(tenantId, async (tx) => {
    const existing = await tx.crmTask.findUnique({ where: { id } });
    if (!existing) throw new Error("Tarefa não encontrada neste workspace.");
    await tx.crmTask.update({
      where: { id },
      data: { title, notes, dueAt, contactId, leadId, assigneeId },
    });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "task.updated", payload: { id, title } },
    });
  });

  revalidatePath("/tasks");
}

/** Marca/desmarca uma tarefa como concluída. */
export async function toggleTask(formData: FormData) {
  const { userId, tenantId } = await requireWorkspaceAccess("task.update");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Tarefa inválida.");

  await withActiveTenant(tenantId, async (tx) => {
    const existing = await tx.crmTask.findUnique({ where: { id } });
    if (!existing) throw new Error("Tarefa não encontrada neste workspace.");
    const done = existing.status === "DONE" ? "PENDING" : "DONE";
    await tx.crmTask.update({ where: { id }, data: { status: done } });
    await tx.domainEvent.create({
      data: {
        tenantId,
        userId,
        type: done === "DONE" ? "task.completed" : "task.reopened",
        payload: { id },
      },
    });
  });

  revalidatePath("/tasks");
}

/** Exclui uma tarefa do workspace ativo. */
export async function deleteTask(formData: FormData) {
  const { userId, tenantId } = await requireWorkspaceAccess("task.delete");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Tarefa inválida.");

  await withActiveTenant(tenantId, async (tx) => {
    const existing = await tx.crmTask.findUnique({ where: { id } });
    if (!existing) throw new Error("Tarefa não encontrada neste workspace.");
    await tx.crmTask.delete({ where: { id } });
    await tx.domainEvent.create({
      data: { tenantId, userId, type: "task.deleted", payload: { id } },
    });
  });

  revalidatePath("/tasks");
}