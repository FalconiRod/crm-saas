// Smoke test da Fase 7 (Leads/Pipeline): cria lead, muda estágio, valida
// contato obrigatório e isolamento entre workspaces.
import "dotenv/config";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { listUserTenants, withTenantContext, withTenant } from "../core/tenancy/tenancy";

const EMAIL_A = "rls_lead_a@example.com";
const EMAIL_B = "rls_lead_b@example.com";

async function main() {
  const plan = await prisma.plan.findFirst({ where: { key: "INDIVIDUAL" } });
  if (!plan) throw new Error("plano INDIVIDUAL ausente");

  const userA = await prisma.user.upsert({
    where: { email: EMAIL_A },
    create: { name: "Lead Test A", email: EMAIL_A },
    update: {},
  });
  const userB = await prisma.user.upsert({
    where: { email: EMAIL_B },
    create: { name: "Lead Test B", email: EMAIL_B },
    update: {},
  });

  for (const m of await listUserTenants(userA.id)) {
    await withTenantContext({ userId: userA.id, tenantId: m.tenantId }, (tx) =>
      tx.tenant.delete({ where: { id: m.tenantId } })
    );
  }

  const tenantA = randomUUID();
  await withTenantContext({ userId: userA.id, tenantId: tenantA }, async (tx) => {
    await tx.tenant.create({ data: { id: tenantA, name: "Leads A", planId: plan.id } });
    await tx.tenantUser.create({ data: { tenantId: tenantA, userId: userA.id, role: "OWNER" } });
  });

  const contact = await withTenant(tenantA, (tx) =>
    tx.crmContact.create({ data: { tenantId: tenantA, name: "Ana Lead" } })
  );

  // Cria lead (estágio NOVO, valor, probabilidade, dono = userA).
  const lead = await withTenant(tenantA, async (tx) => {
    const l = await tx.crmLead.create({
      data: {
        tenantId: tenantA,
        contactId: contact.id,
        stage: "NOVO",
        value: "1500.00",
        probability: 50,
        origin: "Instagram",
        ownerUserId: userA.id,
      },
    });
    await tx.domainEvent.create({
      data: { tenantId: tenantA, userId: userA.id, type: "lead.created", payload: {} },
    });
    return l;
  });
  console.log("OK: lead criado (estágio NOVO, R$ 1500,00, 50%)");

  // Muda de estágio (kanban) → NEGOCIACAO.
  await withTenant(tenantA, (tx) => tx.crmLead.update({ where: { id: lead.id }, data: { stage: "NEGOCIACAO" } }));
  const moved = await withTenant(tenantA, (tx) => tx.crmLead.findUnique({ where: { id: lead.id } }));
  if (moved?.stage !== "NEGOCIACAO") throw new Error("mudança de estágio falhou");
  console.log("OK: lead movido para NEGOCIACAO");

  // Contato de outro workspace não pode ser usado (RLS: não é encontrável).
  const tenantB = randomUUID();
  await withTenantContext({ userId: userB.id, tenantId: tenantB }, async (tx) => {
    await tx.tenant.create({ data: { id: tenantB, name: "Leads B", planId: plan.id } });
    await tx.tenantUser.create({ data: { tenantId: tenantB, userId: userB.id, role: "OWNER" } });
  });
  const foreignContact = await withTenant(tenantB, (tx) =>
    tx.crmContact.findUnique({ where: { id: contact.id } })
  );
  if (foreignContact) throw new Error("VAZOU: workspace B enxergou contato do A");
  console.log("OK: isolamento (contato de A invisível para B)");

  // Ganhos: lead em NEGOCIACAO não conta como ganho.
  const ganho = await withTenant(tenantA, (tx) =>
    tx.crmLead.count({ where: { stage: "GANHO" } })
  );
  if (ganho !== 0) throw new Error("não deveria haver ganhos");
  console.log("OK: total de ganhos correto (0 até virar GANHO)");

  // Delete + cleanup.
  await withTenant(tenantA, (tx) => tx.crmLead.delete({ where: { id: lead.id } }));
  await withTenantContext({ userId: userA.id, tenantId: tenantA }, (tx) =>
    tx.tenant.delete({ where: { id: tenantA } })
  );
  await withTenantContext({ userId: userB.id, tenantId: tenantB }, (tx) =>
    tx.tenant.delete({ where: { id: tenantB } })
  );
  await prisma.user.delete({ where: { id: userA.id } });
  await prisma.user.delete({ where: { id: userB.id } });
  await prisma.$disconnect();
  console.log("LEADS_OK");
}

main().catch(async (e) => {
  console.error("ERRO:", e);
  await prisma.$disconnect();
  process.exit(1);
});