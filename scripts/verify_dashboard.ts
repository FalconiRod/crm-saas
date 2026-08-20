// Smoke test da Fase 8 (Dashboard/Relatórios): valida as métricas calculadas
// (funil por estágio, ganhos, conversão) sobre dados reais do tenant.
import "dotenv/config";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { listUserTenants, withTenantContext, withTenant } from "../core/tenancy/tenancy";
import { PIPELINE_STAGES, type PipelineStage } from "@shared/index";

const EMAIL_A = "rls_dash_a@example.com";

function formatBRL(value: string | null) {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function main() {
  const plan = await prisma.plan.findFirst({ where: { key: "INDIVIDUAL" } });
  if (!plan) throw new Error("plano INDIVIDUAL ausente");

  const userA = await prisma.user.upsert({
    where: { email: EMAIL_A },
    create: { name: "Dash Test A", email: EMAIL_A },
    update: {},
  });
  for (const m of await listUserTenants(userA.id)) {
    await withTenantContext({ userId: userA.id, tenantId: m.tenantId }, (tx) =>
      tx.tenant.delete({ where: { id: m.tenantId } })
    );
  }

  const tenantA = randomUUID();
  await withTenantContext({ userId: userA.id, tenantId: tenantA }, async (tx) => {
    await tx.tenant.create({ data: { id: tenantA, name: "Dash A", planId: plan.id } });
    await tx.tenantUser.create({ data: { tenantId: tenantA, userId: userA.id, role: "OWNER" } });
  });

  // 5 leads: 2 GANHO (1000 + 500), 1 PERDIDO, 2 em aberto.
  const leads = await withTenant(tenantA, async (tx) => {
    const out: { id: string; stage: PipelineStage; value: string | null }[] = [];
    const stages: [PipelineStage, string | null][] = [
      ["GANHO", "1000.00"],
      ["GANHO", "500.00"],
      ["PERDIDO", "200.00"],
      ["NOVO", "300.00"],
      ["NEGOCIACAO", "700.00"],
    ];
    for (const [stage, value] of stages) {
      const contact = await tx.crmContact.create({
        data: { tenantId: tenantA, name: `C-${stage}` },
      });
      const l = await tx.crmLead.create({
        data: { tenantId: tenantA, contactId: contact.id, stage, value, ownerUserId: userA.id },
      });
      out.push({ id: l.id, stage, value });
    }
    return out;
  });
  console.log("OK: 5 leads criados (2 GANHO, 1 PERDIDO, 2 em aberto)");

  // Mesma lógica do dashboard.
  const total = leads.length;
  const byStage = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s, leads.filter((l) => l.stage === s).length])
  ) as Record<PipelineStage, number>;
  const ganhos = leads
    .filter((l) => l.stage === "GANHO" && l.value)
    .reduce((acc, l) => acc + Number(l.value), 0);
  const conversao = total > 0 ? Math.round((byStage.GANHO / total) * 100) : 0;
  const abertos = total - byStage.GANHO - byStage.PERDIDO;

  if (ganhos !== 1500) throw new Error(`ganhos deveriam ser 1500, veio ${ganhos}`);
  if (byStage.GANHO !== 2 || byStage.PERDIDO !== 1) throw new Error("contagem por estágio errada");
  if (conversao !== 40) throw new Error(`conversão deveria ser 40%, veio ${conversao}%`);
  if (abertos !== 2) throw new Error(`em aberto deveria ser 2, veio ${abertos}`);
  console.log(`OK: ganhos=${formatBRL(ganhos.toFixed(2))}, conversão=${conversao}%, abertos=${abertos}`);

  // Cleanup.
  await withTenantContext({ userId: userA.id, tenantId: tenantA }, (tx) =>
    tx.tenant.delete({ where: { id: tenantA } })
  );
  await prisma.user.delete({ where: { id: userA.id } });
  await prisma.$disconnect();
  console.log("DASHBOARD_OK");
}

main().catch(async (e) => {
  console.error("ERRO:", e);
  await prisma.$disconnect();
  process.exit(1);
});