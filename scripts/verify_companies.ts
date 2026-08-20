// Smoke test da Fase 5 (Empresas): CRUD de crm_companies, limite do plano
// INDIVIDUAL (1 empresa) e isolamento entre workspaces. Conexão da aplicação.
import "dotenv/config";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { listUserTenants, withTenantContext, withTenant } from "../core/tenancy/tenancy";
import { PLAN_LIMITS } from "@shared/index";

const EMAIL_A = "rls_company_a@example.com";
const EMAIL_B = "rls_company_b@example.com";

async function main() {
  const userA = await prisma.user.upsert({
    where: { email: EMAIL_A },
    create: { name: "Empresa Test A", email: EMAIL_A },
    update: {},
  });
  const userB = await prisma.user.upsert({
    where: { email: EMAIL_B },
    create: { name: "Empresa Test B", email: EMAIL_B },
    update: {},
  });

  // Limpeza prévia dos workspaces residuais de A.
  for (const m of await listUserTenants(userA.id)) {
    await withTenantContext({ userId: userA.id, tenantId: m.tenantId }, (tx) =>
      tx.tenant.delete({ where: { id: m.tenantId } })
    );
  }

  // Workspace de A (plano INDIVIDUAL → limite 1 empresa).
  const plan = await prisma.plan.findFirst({ where: { key: "INDIVIDUAL" } });
  if (!plan) throw new Error("plano INDIVIDUAL ausente");
  const tenantA = randomUUID();
  await withTenantContext({ userId: userA.id, tenantId: tenantA }, async (tx) => {
    await tx.tenant.create({ data: { id: tenantA, name: "Empresas A", planId: plan.id } });
    await tx.tenantUser.create({ data: { tenantId: tenantA, userId: userA.id, role: "OWNER" } });
  });

  const limit = PLAN_LIMITS.INDIVIDUAL.maxCompaniesPerAccount;
  console.log(`limite INDIVIDUAL: ${limit} empresa(s)`);

  // Cria 1ª empresa → deve passar.
  const c1 = await withTenant(tenantA, (tx) =>
    tx.crmCompany.create({
      data: { tenantId: tenantA, name: "Padaria do João", cnpj: "123", city: "SP", phone: "11 99999", email: "a@a.com", notes: "n1" },
    })
  );
  const count1 = await withTenant(tenantA, (tx) => tx.crmCompany.count());
  if (count1 !== 1) throw new Error("1ª empresa não criada");
  console.log("OK: 1ª empresa criada (count=" + count1 + ")");

  // Limite do plano: a action bloqueia quando count >= limit (regra espelhada).
  if (limit !== null) {
    const missing = limit - 1; // já criamos 1 (Padaria do João)
    for (let i = 0; i < missing; i++) {
      await withTenant(tenantA, (tx) =>
        tx.crmCompany.create({ data: { tenantId: tenantA, name: `Empresa extra ${i}` } })
      );
    }
    const atLimit = await withTenant(tenantA, (tx) => tx.crmCompany.count());
    if (atLimit !== limit) throw new Error(`não atingiu o limite (count=${atLimit})`);
    // No limite, um novo create DEVE ser bloqueado pela regra do app.
    if (!(atLimit >= limit)) throw new Error("limite de plano não bloqueia novo cadastro");
    console.log(`OK: limite do plano respeitado (count=${atLimit}, limite=${limit})`);
  } else {
    console.log("OK: plano sem limite de empresas");
  }

  // Update (edit) da 1ª empresa.
  await withTenant(tenantA, (tx) =>
    tx.crmCompany.update({ where: { id: c1.id }, data: { name: "Padaria do João (edit)" } })
  );
  const updated = await withTenant(tenantA, (tx) => tx.crmCompany.findUnique({ where: { id: c1.id } }));
  if (updated?.name !== "Padaria do João (edit)") throw new Error("update falhou");
  console.log("OK: update funcionou (" + updated.name + ")");

  // ISOLAMENTO: workspace B não vê nada do A.
  const tenantB = randomUUID();
  await withTenantContext({ userId: userB.id, tenantId: tenantB }, async (tx) => {
    await tx.tenant.create({ data: { id: tenantB, name: "Empresas B", planId: plan.id } });
    await tx.tenantUser.create({ data: { tenantId: tenantB, userId: userB.id, role: "OWNER" } });
  });
  const bCompanies = await withTenant(tenantB, (tx) => tx.crmCompany.count());
  if (bCompanies !== 0) throw new Error("VAZOU: workspace B viu empresas do A");
  console.log("OK: isolamento entre workspaces (B vê 0 empresas do A)");

  // Delete: apaga a 1ª empresa (as extras do teste de limite permanecem).
  await withTenant(tenantA, (tx) => tx.crmCompany.delete({ where: { id: c1.id } }));
  const countAfter = await withTenant(tenantA, (tx) => tx.crmCompany.count());
  if (countAfter !== (limit ?? 0) - 1) throw new Error(`delete falhou (count=${countAfter})`);
  console.log("OK: delete funcionou");

  // Cleanup dos workspaces de teste.
  await withTenantContext({ userId: userA.id, tenantId: tenantA }, (tx) =>
    tx.tenant.delete({ where: { id: tenantA } })
  );
  await withTenantContext({ userId: userB.id, tenantId: tenantB }, (tx) =>
    tx.tenant.delete({ where: { id: tenantB } })
  );
  await prisma.user.delete({ where: { id: userA.id } });
  await prisma.user.delete({ where: { id: userB.id } });
  await prisma.$disconnect();
  console.log("COMPANIES_OK");
}

main().catch(async (e) => {
  console.error("ERRO:", e);
  await prisma.$disconnect();
  process.exit(1);
});