// Smoke test da Fase 6 (Contatos) + limite de 5 empresas (migration plan_limits).
// Cria contatos, valida vínculo com empresa, isolamento entre workspaces.
import "dotenv/config";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { listUserTenants, withTenantContext, withTenant } from "../core/tenancy/tenancy";

const EMAIL_A = "rls_contact_a@example.com";
const EMAIL_B = "rls_contact_b@example.com";

async function main() {
  // Plano Individual agora deve ter limite de 5 empresas.
  const plan = await prisma.plan.findFirst({ where: { key: "INDIVIDUAL" } });
  if (!plan) throw new Error("plano INDIVIDUAL ausente");
  if (plan.maxCompaniesPerAccount !== 5)
    throw new Error(`limite INDIVIDUAL deveria ser 5, veio ${plan.maxCompaniesPerAccount}`);
  console.log("OK: plano INDIVIDUAL com limite de 5 empresas");

  const userA = await prisma.user.upsert({
    where: { email: EMAIL_A },
    create: { name: "Contact Test A", email: EMAIL_A },
    update: {},
  });
  const userB = await prisma.user.upsert({
    where: { email: EMAIL_B },
    create: { name: "Contact Test B", email: EMAIL_B },
    update: {},
  });

  for (const m of await listUserTenants(userA.id)) {
    await withTenantContext({ userId: userA.id, tenantId: m.tenantId }, (tx) =>
      tx.tenant.delete({ where: { id: m.tenantId } })
    );
  }

  const tenantA = randomUUID();
  await withTenantContext({ userId: userA.id, tenantId: tenantA }, async (tx) => {
    await tx.tenant.create({ data: { id: tenantA, name: "Contatos A", planId: plan.id } });
    await tx.tenantUser.create({ data: { tenantId: tenantA, userId: userA.id, role: "OWNER" } });
  });

  // Empresa para vincular.
  const company = await withTenant(tenantA, (tx) =>
    tx.crmCompany.create({ data: { tenantId: tenantA, name: "Empresa Vinculada" } })
  );

  // Cria 2 contatos, um vinculado à empresa.
  await withTenant(tenantA, async (tx) => {
    await tx.crmContact.create({
      data: { tenantId: tenantA, name: "Maria", phone: "119999", email: "m@a.com", tags: ["hot"], origin: "Instagram", crmCompanyId: company.id },
    });
    await tx.crmContact.create({
      data: { tenantId: tenantA, name: "João", email: "j@a.com", tags: ["frio", "novo"] },
    });
  });

  const contacts = await withTenant(tenantA, (tx) =>
    tx.crmContact.findMany({ include: { crmCompany: true }, orderBy: { name: "asc" } })
  );
  if (contacts.length !== 2) throw new Error("deveria ter 2 contatos");
  const linked = contacts.find((c) => c.crmCompanyId === company.id);
  if (!linked || linked.crmCompany?.name !== "Empresa Vinculada")
    throw new Error("vínculo contato->empresa falhou");
  if (linked.tags.join(",") !== "hot") throw new Error("tags não salvas corretamente");
  console.log("OK: 2 contatos criados, vínculo com empresa e tags OK");

  // Busca por nome (case-insensitive) — mesmo critério da tela.
  const search = await withTenant(tenantA, (tx) =>
    tx.crmContact.findMany({ where: { name: { contains: "mar", mode: "insensitive" } } })
  );
  if (search.length !== 1 || search[0].name !== "Maria") throw new Error("busca falhou");
  console.log("OK: busca por nome funciona");

  // Edição (update de tags).
  await withTenant(tenantA, (tx) =>
    tx.crmContact.update({ where: { id: contacts[0].id }, data: { tags: ["hot", "prioridade"] } })
  );
  const edited = await withTenant(tenantA, (tx) => tx.crmContact.findUnique({ where: { id: contacts[0].id } }));
  if (edited?.tags.length !== 2) throw new Error("update de tags falhou");
  console.log("OK: edição de contato funcionou");

  // ISOLAMENTO: workspace B não vê nada.
  const tenantB = randomUUID();
  await withTenantContext({ userId: userB.id, tenantId: tenantB }, async (tx) => {
    await tx.tenant.create({ data: { id: tenantB, name: "Contatos B", planId: plan.id } });
    await tx.tenantUser.create({ data: { tenantId: tenantB, userId: userB.id, role: "OWNER" } });
  });
  const bCount = await withTenant(tenantB, (tx) => tx.crmContact.count());
  if (bCount !== 0) throw new Error("VAZOU: workspace B viu contatos do A");
  console.log("OK: isolamento entre workspaces (B vê 0 contatos do A)");

  // Delete.
  await withTenant(tenantA, (tx) => tx.crmContact.deleteMany());
  const afterDelete = await withTenant(tenantA, (tx) => tx.crmContact.count());
  if (afterDelete !== 0) throw new Error("delete falhou");
  console.log("OK: exclusão de contatos funcionou");

  // Cleanup.
  await withTenantContext({ userId: userA.id, tenantId: tenantA }, (tx) =>
    tx.tenant.delete({ where: { id: tenantA } })
  );
  await withTenantContext({ userId: userB.id, tenantId: tenantB }, (tx) =>
    tx.tenant.delete({ where: { id: tenantB } })
  );
  await prisma.user.delete({ where: { id: userA.id } });
  await prisma.user.delete({ where: { id: userB.id } });
  await prisma.$disconnect();
  console.log("CONTACTS_OK");
}

main().catch(async (e) => {
  console.error("ERRO:", e);
  await prisma.$disconnect();
  process.exit(1);
});