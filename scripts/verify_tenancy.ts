// Smoke test da Fase 4 (tenancy): cria workspace, lista vínculos, valida
// isolamento entre usuários e faz cleanup. Usa a conexão da aplicação
// (APP_DATABASE_URL -> app_user, sem BYPASSRLS).
import "dotenv/config";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import {
  listUserTenants,
  getMembership,
  withTenantContext,
  withTenant,
} from "../core/tenancy/tenancy";

const EMAIL_A = "rlstest_a@example.com";
const EMAIL_B = "rlstest_b@example.com";

async function main() {
  // Usuários de teste (users não tem RLS — cria/atualiza direto).
  const userA = await prisma.user.upsert({
    where: { email: EMAIL_A },
    create: { name: "RLS Test A", email: EMAIL_A },
    update: {},
  });
  const userB = await prisma.user.upsert({
    where: { email: EMAIL_B },
    create: { name: "RLS Test B", email: EMAIL_B },
    update: {},
  });

  // Limpeza prévia (idempotente): apaga workspaces residuais de userA.
  const before = await listUserTenants(userA.id);
  for (const m of before) {
    await withTenantContext(
      { userId: userA.id, tenantId: m.tenantId },
      (tx) => tx.tenant.delete({ where: { id: m.tenantId } })
    );
  }
  console.log("OK: cleanup previo (" + before.length + " workspace(s) residual(is) removido(s))");

  // Cria workspace (mesmo fluxo da server action createWorkspace).
  const plan = await prisma.plan.findFirst({ where: { key: "INDIVIDUAL" } });
  if (!plan) throw new Error("plano INDIVIDUAL ausente");
  const tenantId = randomUUID();
  await withTenantContext({ userId: userA.id, tenantId }, async (tx) => {
    await tx.tenant.create({ data: { id: tenantId, name: "RLS Test Workspace", planId: plan.id } });
    await tx.tenantUser.create({ data: { tenantId, userId: userA.id, role: "OWNER" } });
    await tx.domainEvent.create({
      data: { tenantId, userId: userA.id, type: "tenant.created", payload: { name: "RLS Test Workspace" } },
    });
  });
  console.log("OK: workspace criado (" + tenantId + ")");

  // Lista vínculos do dono.
  const ms = await listUserTenants(userA.id);
  if (ms.length !== 1 || ms[0].tenantId !== tenantId || ms[0].role !== "OWNER") {
    throw new Error("listUserTenants não retornou o vínculo esperado: " + JSON.stringify(ms));
  }
  console.log("OK: listUserTenants retorna o workspace (papel OWNER)");

  // Dados de CRM escopados por RLS.
  await withTenant(tenantId, async (tx) => {
    await tx.crmCompany.create({ data: { tenantId, name: "Empresa RLS" } });
    const n = await tx.crmCompany.count();
    if (n !== 1) throw new Error("count crm_companies != 1");
  });
  console.log("OK: dados do tenant visíveis dentro do contexto");

  // ISOLAMENTO: outro usuário não enxerga o workspace nem tem acesso.
  const otherMs = await listUserTenants(userB.id);
  if (otherMs.length !== 0) throw new Error("VAZOU: userB viu o workspace de userA");
  const otherAccess = await getMembership(userB.id, tenantId);
  if (otherAccess) throw new Error("VAZOU: userB tem acesso ao tenant de userA");
  console.log("OK: isolamento entre usuários (userB não vê nada)");

  // Cleanup: dono apaga o workspace (cascade remove vínculo + eventos + empresa).
  await withTenantContext({ userId: userA.id, tenantId }, (tx) =>
    tx.tenant.delete({ where: { id: tenantId } })
  );
  const after = await listUserTenants(userA.id);
  if (after.length !== 0) throw new Error("cleanup não removeu o workspace");
  await prisma.user.delete({ where: { id: userA.id } });
  await prisma.user.delete({ where: { id: userB.id } });
  console.log("OK: cleanup concluído");

  await prisma.$disconnect();
  console.log("TENANCY_OK");
}

main().catch(async (e) => {
  console.error("ERRO:", e);
  await prisma.$disconnect();
  process.exit(1);
});