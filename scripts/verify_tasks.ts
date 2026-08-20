// Smoke test do módulo de Tarefas (Fase 11).
// Verifica:
//  • CRUD completo de tarefa (criar, editar, concluir/reabrir, excluir);
//  • isolamento de tenant no BANCO (outro workspace não enxerga nem mexe);
//  • matriz de permissões por papel (VIEWER/USER/MANAGER/ADMIN/OWNER);
//  • vinculo com contato do MESMO workspace.
import "dotenv/config";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { listUserTenants, withTenantContext } from "../core/tenancy/tenancy";
import { can } from "../core/permissions/access";

const EMAIL_OWNER_A = "tasks_owner_a@example.com";
const EMAIL_OWNER_B = "tasks_owner_b@example.com";

async function expectError(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
  } catch {
    return; // erro (RLS / P2025) = comportamento esperado
  }
  throw new Error(`${label}: deveria ter sido BLOQUEADO`);
}

async function main() {
  const ownerA = await prisma.user.upsert({
    where: { email: EMAIL_OWNER_A },
    create: { name: "Tasks Owner A", email: EMAIL_OWNER_A },
    update: {},
  });
  const ownerB = await prisma.user.upsert({
    where: { email: EMAIL_OWNER_B },
    create: { name: "Tasks Owner B", email: EMAIL_OWNER_B },
    update: {},
  });
  const teamPlan = await prisma.plan.findFirst({ where: { key: "TEAM" } });
  if (!teamPlan) throw new Error("plano TEAM ausente");

  for (const u of [ownerA, ownerB]) {
    for (const m of await listUserTenants(u.id)) {
      await withTenantContext({ userId: u.id, tenantId: m.tenantId }, (tx) =>
        tx.tenant.delete({ where: { id: m.tenantId } })
      );
    }
  }

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  await withTenantContext({ userId: ownerA.id, tenantId: tenantA }, async (tx) => {
    await tx.tenant.create({ data: { id: tenantA, name: "Tarefas A", planId: teamPlan.id } });
    await tx.tenantUser.create({ data: { tenantId: tenantA, userId: ownerA.id, role: "OWNER" } });
  });
  await withTenantContext({ userId: ownerB.id, tenantId: tenantB }, async (tx) => {
    await tx.tenant.create({ data: { id: tenantB, name: "Tarefas B", planId: teamPlan.id } });
    await tx.tenantUser.create({ data: { tenantId: tenantB, userId: ownerB.id, role: "OWNER" } });
  });

  // Contato + lead do tenant A (para vincular a tarefa).
  let contactAId: string;
  let leadAId: string;
  await withTenantContext({ userId: ownerA.id, tenantId: tenantA }, async (tx) => {
    const contact = await tx.crmContact.create({
      data: { tenantId: tenantA, name: "Maria Tarefas", phone: "11999999999" },
    });
    contactAId = contact.id;
    const lead = await tx.crmLead.create({
      data: { tenantId: tenantA, contactId: contact.id, stage: "NOVO" },
    });
    leadAId = lead.id;
  });
  console.log("OK: contato e lead do tenant A criados");

  // 1) CRUD completo no tenant A.
  let taskId = "";
  await withTenantContext({ userId: ownerA.id, tenantId: tenantA }, async (tx) => {
    const task = await tx.crmTask.create({
      data: {
        tenantId: tenantA,
        title: "Ligar para Maria",
        notes: "Alinhar proposta",
        dueAt: new Date("2099-01-01T10:00:00Z"),
        contactId: contactAId,
        leadId: leadAId,
        assigneeId: ownerA.id,
        createdById: ownerA.id,
      },
    });
    taskId = task.id;
    await tx.domainEvent.create({
      data: { tenantId: tenantA, userId: ownerA.id, type: "task.created", payload: { title: "Ligar para Maria" } },
    });
  });
  if (!taskId) throw new Error("criar tarefa falhou");
  console.log("OK: tarefa criada vinculada a contato+lead");

  // Editar título.
  await withTenantContext({ userId: ownerA.id, tenantId: tenantA }, (tx) =>
    tx.crmTask.update({ where: { id: taskId }, data: { title: "Ligar para Maria hoje" } })
  );
  const updated = await withTenantContext({ userId: ownerA.id, tenantId: tenantA }, (tx) =>
    tx.crmTask.findUnique({ where: { id: taskId } })
  );
  if (updated?.title !== "Ligar para Maria hoje") throw new Error("editar tarefa falhou");
  console.log("OK: tarefa editada");

  // Concluir e reabrir.
  await withTenantContext({ userId: ownerA.id, tenantId: tenantA }, (tx) =>
    tx.crmTask.update({ where: { id: taskId }, data: { status: "DONE" } })
  );
  const done = await withTenantContext({ userId: ownerA.id, tenantId: tenantA }, (tx) =>
    tx.crmTask.findUnique({ where: { id: taskId } })
  );
  if (done?.status !== "DONE") throw new Error("concluir tarefa falhou");
  await withTenantContext({ userId: ownerA.id, tenantId: tenantA }, (tx) =>
    tx.crmTask.update({ where: { id: taskId }, data: { status: "PENDING" } })
  );
  console.log("OK: concluir/reabrir tarefa");

  // 2) ISOLAMENTO: tenant B não vê e não mexe na tarefa do A.
  const seenByB = await withTenantContext({ userId: ownerB.id, tenantId: tenantB }, (tx) =>
    tx.crmTask.findMany()
  );
  if (seenByB.length !== 0) throw new Error("vazou tarefa para outro tenant (SELECT)");
  console.log("OK: outro tenant não enxerga tarefa (SELECT)");

  await expectError(
    () =>
      withTenantContext({ userId: ownerB.id, tenantId: tenantB }, (tx) =>
        tx.crmTask.update({ where: { id: taskId }, data: { title: "invadido" } })
      ),
    "editar tarefa de outro tenant"
  );
  console.log("OK: editar tarefa de outro tenant bloqueado");

  await expectError(
    () =>
      withTenantContext({ userId: ownerB.id, tenantId: tenantB }, (tx) =>
        tx.crmTask.delete({ where: { id: taskId } })
      ),
    "excluir tarefa de outro tenant"
  );
  console.log("OK: excluir tarefa de outro tenant bloqueado");

  // 3) Vinculo com contato de OUTRO tenant: o BANCO aceita (FK ignora RLS), mas
  //    a CAMADA DO APP bloqueia — a validação `validateTargets` faz findUnique no
  //    contato dentro do tenant ativo, e o RLS devolve NULL (contato inexistente).
  const contactB = await withTenantContext({ userId: ownerB.id, tenantId: tenantB }, (tx) =>
    tx.crmContact.create({ data: { tenantId: tenantB, name: "João B" } })
  );
  const contactReadFromA = await withTenantContext({ userId: ownerA.id, tenantId: tenantA }, (tx) =>
    tx.crmContact.findUnique({ where: { id: contactB.id } })
  );
  if (contactReadFromA) throw new Error("contato de outro tenant visível dentro do tenant A");
  console.log("OK: contato de outro tenant invisível pelo RLS (app rejeita o vínculo)");

  // 4) Matriz de permissões (aplica ao app; o banco protege por tenant).
  const cases: { role: Parameters<typeof can>[0]; perm: string; expected: boolean }[] = [
    { role: "VIEWER", perm: "task.create", expected: false },
    { role: "VIEWER", perm: "task.update", expected: false },
    { role: "VIEWER", perm: "task.delete", expected: false },
    { role: "USER", perm: "task.create", expected: true },
    { role: "USER", perm: "task.update", expected: true },
    { role: "USER", perm: "task.delete", expected: false },
    { role: "MANAGER", perm: "task.create", expected: true },
    { role: "MANAGER", perm: "task.update", expected: true },
    { role: "MANAGER", perm: "task.delete", expected: true },
    { role: "ADMIN", perm: "task.delete", expected: true },
    { role: "OWNER", perm: "task.delete", expected: true },
  ];
  for (const c of cases) {
    const got = can(c.role, c.perm as Parameters<typeof can>[1]);
    if (got !== c.expected)
      throw new Error(`permissão ${c.perm} para ${c.role}: esperado ${c.expected}, veio ${got}`);
  }
  console.log("OK: matriz de permissões de tarefas por papel");

  // Cleanup: exclusão em cascata.
  await withTenantContext({ userId: ownerA.id, tenantId: tenantA }, (tx) =>
    tx.tenant.delete({ where: { id: tenantA } })
  );
  await withTenantContext({ userId: ownerB.id, tenantId: tenantB }, (tx) =>
    tx.tenant.delete({ where: { id: tenantB } })
  );
  for (const u of [ownerA, ownerB]) await prisma.user.delete({ where: { id: u.id } });
  await prisma.$disconnect();
  console.log("TASKS_OK");
}

main().catch(async (e) => {
  console.error("ERRO:", e);
  await prisma.$disconnect();
  process.exit(1);
});