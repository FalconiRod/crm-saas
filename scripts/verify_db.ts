// Smoke test do banco (Fase 2): planos seed, RLS fail-closed e fluxo dentro do tenant.
// Uso: npx tsx scripts/verify_db.ts
// Conecta com APP_DATABASE_URL (papel app_user, SEM BYPASSRLS) via lib/prisma.
// Cria um tenant de teste "tenant_smoke_test", valida e apaga (idempotente).
import "dotenv/config";
import { prisma } from "../lib/prisma";

const TENANT_SMOKE = "tenant_smoke_test";

async function withTenant<T>(tenantId: string, fn: (tx: typeof prisma) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx as unknown as typeof prisma);
  });
}

async function main() {
  // 1) Planos seed existem.
  const plans = await prisma.plan.findMany({ orderBy: { key: "asc" } });
  console.log("PLANS:", plans.map((p) => `${p.key}(${p.name}, max_users=${p.maxUsers}, max_companies=${p.maxCompaniesPerAccount}, price=${p.priceCents})`).join(" | "));
  if (plans.length !== 3) throw new Error(`esperado 3 planos, veio ${plans.length}`);

  // Limpeza prévia (idempotente): limpa dados CRM do tenant; o próprio tenant
  // não é apagado pois a policy de DELETE exige OWNER (o tenant de teste não tem).
  await withTenant(TENANT_SMOKE, async (tx) => {
    await tx.crmLead.deleteMany();
    await tx.crmContact.deleteMany();
    await tx.crmCompany.deleteMany();
    await tx.domainEvent.deleteMany();
  });

  // 2) Cria tenant (se não existe) + company + contact + lead DENTRO do tenant.
  await withTenant(TENANT_SMOKE, async (tx) => {
    const plan = await tx.plan.findFirst({ where: { key: "INDIVIDUAL" } });
    if (!plan) throw new Error("plano INDIVIDUAL ausente");
    await tx.tenant.upsert({
      where: { id: TENANT_SMOKE },
      update: {},
      create: { id: TENANT_SMOKE, name: "Tenant Smoke Test", planId: plan.id },
    });
    const company = await tx.crmCompany.create({ data: { tenantId: TENANT_SMOKE, name: "Empresa Teste" } });
    const contact = await tx.crmContact.create({ data: { tenantId: TENANT_SMOKE, name: "Contato Teste", crmCompanyId: company.id } });
    await tx.crmLead.create({ data: { tenantId: TENANT_SMOKE, contactId: contact.id, stage: "NOVO", value: 1500 } });
  });
  console.log("OK: create tenant+company+contact+lead dentro do tenant");

  // 3) Leitura filtrada pelo tenant certo.
  const companies = await withTenant(TENANT_SMOKE, (tx) => tx.crmCompany.findMany());
  console.log("OK: tenant smoke le", companies.length, "empresa(s)");
  if (companies.length !== 1) throw new Error("esperado 1 empresa no tenant smoke");

  // 4) Isolamento: outro tenant NAO enxerga nada.
  const otherCount = await withTenant("tenant_outro", (tx) => tx.crmCompany.count());
  console.log("OK: tenant_outro ve", otherCount, "empresa(s) (esperado 0)");
  if (otherCount !== 0) throw new Error("VAZOU dado entre tenants!");

  // 5) Fail-closed REAL: tenant existe, mas sem app.tenant_id o INSERT deve falhar (RLS).
  let blocked = false;
  try {
    await prisma.crmContact.create({ data: { tenantId: TENANT_SMOKE, name: "X" } });
  } catch {
    blocked = true;
  }
  console.log(blocked ? "OK: RLS bloqueou insert sem app.tenant_id (fail-closed)" : "FAIL: RLS NAO bloqueou insert sem tenant");
  if (!blocked) throw new Error("RLS não está ativo para INSERT");

  // 6) Limpeza: apaga dados CRM (o tenant de teste fica — policy de DELETE exige OWNER).
  await withTenant(TENANT_SMOKE, async (tx) => {
    await tx.crmLead.deleteMany();
    await tx.crmContact.deleteMany();
    await tx.crmCompany.deleteMany();
    await tx.domainEvent.deleteMany();
  });
  console.log("OK: cleanup CRM data concluido");

  await prisma.$disconnect();
  console.log("SMOKE_OK");
}

main().catch(async (e) => {
  console.error("ERRO:", e);
  await prisma.$disconnect();
  process.exit(1);
});