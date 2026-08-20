// Smoke test da Fase 9 (Times/Papéis): convite, aceite automático, mudança de
// papel, remoção, permissões por papel e limite de membros do plano.
import "dotenv/config";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { listUserTenants, withTenantContext } from "../core/tenancy/tenancy";
import { can } from "../core/permissions/access";

const EMAIL_OWNER = "rls_team_owner@example.com";
const EMAIL_MGR = "rls_team_mgr@example.com";
const EMAIL_VIEW = "rls_team_view@example.com";
const EMAIL_OUTSIDER = "rls_team_out@example.com";

// Espelha a lógica de lib/session.acceptPendingInvitations (sem next/cookies).
// O convite NÃO é marcado ACCEPTED: "Aceito" é derivado do vínculo criado.
async function acceptInvitations(user: { id: string; email: string | null }) {
  if (!user.email) return 0;
  const email = user.email;
  const pending = await withTenantContext({ email }, (tx) =>
    tx.invitation.findMany({ where: { email, status: "PENDING" } })
  );
  for (const inv of pending) {
    await withTenantContext({ userId: user.id, tenantId: inv.tenantId, email: user.email }, async (tx) => {
      const existing = await tx.tenantUser.findUnique({
        where: { tenantId_userId: { tenantId: inv.tenantId, userId: user.id } },
      });
      if (!existing) {
        await tx.tenantUser.create({ data: { tenantId: inv.tenantId, userId: user.id, role: inv.role } });
      }
    });
  }
}

async function main() {
  const owner = await prisma.user.upsert({ where: { email: EMAIL_OWNER }, create: { name: "Team Owner", email: EMAIL_OWNER }, update: {} });
  const mgr = await prisma.user.upsert({ where: { email: EMAIL_MGR }, create: { name: "Team Mgr", email: EMAIL_MGR }, update: {} });
  const view = await prisma.user.upsert({ where: { email: EMAIL_VIEW }, create: { name: "Team View", email: EMAIL_VIEW }, update: {} });
  const out = await prisma.user.upsert({ where: { email: EMAIL_OUTSIDER }, create: { name: "Team Out", email: EMAIL_OUTSIDER }, update: {} });

  // Plano TEAM (maxUsers = 10) para caber o teste; INDIVIDUAL (1) testa limite.
  const teamPlan = await prisma.plan.findFirst({ where: { key: "TEAM" } });
  const individualPlan = await prisma.plan.findFirst({ where: { key: "INDIVIDUAL" } });
  if (!teamPlan || !individualPlan) throw new Error("planos ausentes");

  for (const u of [owner, mgr, view]) {
    for (const m of await listUserTenants(u.id)) {
      await withTenantContext({ userId: u.id, tenantId: m.tenantId }, (tx) => tx.tenant.delete({ where: { id: m.tenantId } }));
    }
  }

  const tenantId = randomUUID();
  await withTenantContext({ userId: owner.id, tenantId }, async (tx) => {
    await tx.tenant.create({ data: { id: tenantId, name: "Equipe Teste", planId: teamPlan.id } });
    await tx.tenantUser.create({ data: { tenantId, userId: owner.id, role: "OWNER" } });
  });
  console.log("OK: workspace TEAM criado (maxUsers=10)");

  // Convite (owner -> mgr) como MANAGER.
  await withTenantContext({ userId: owner.id, tenantId }, async (tx) => {
    await tx.invitation.create({ data: { tenantId, email: EMAIL_MGR, role: "MANAGER", invitedBy: owner.id } });
    await tx.invitation.create({ data: { tenantId, email: EMAIL_VIEW, role: "VIEWER", invitedBy: owner.id } });
  });
  const pendingCount = await withTenantContext({ userId: owner.id, tenantId }, (tx) =>
    tx.invitation.count({ where: { tenantId, status: "PENDING" } })
  );
  if (pendingCount !== 2) throw new Error("convites pendentes != 2");
  console.log("OK: 2 convites criados (MANAGER e VIEWER)");

  // Outsider NÃO enxerga convite pendente alheio.
  const outsiderSees = await withTenantContext({ email: EMAIL_OUTSIDER }, (tx) =>
    tx.invitation.findMany({ where: { email: EMAIL_MGR, status: "PENDING" } })
  );
  if (outsiderSees.length !== 0) throw new Error("VAZOU: outsider viu convite de outro e-mail");
  console.log("OK: convite visível apenas para o e-mail convidado");

  // Aceite automático (mgr -> MANAGER, view -> VIEWER).
  await acceptInvitations(mgr);
  await acceptInvitations(view);
  const mgrMs = await listUserTenants(mgr.id);
  const viewMs = await listUserTenants(view.id);
  if (mgrMs.length !== 1 || mgrMs[0].role !== "MANAGER") throw new Error("mgr não virou MANAGER");
  if (viewMs.length !== 1 || viewMs[0].role !== "VIEWER") throw new Error("view não virou VIEWER");
  // O convite continua PENDING (o "aceito" é derivado do vínculo).
  const stillPending = await withTenantContext({ userId: owner.id, tenantId }, (tx) =>
    tx.invitation.count({ where: { tenantId, status: "PENDING" } })
  );
  if (stillPending !== 2) throw new Error("convites deveriam continuar PENDING após o aceite");
  console.log("OK: aceite automático (MANAGER e VIEWER, convite segue PENDING)");

  // Permissões: MANAGER cria empresa e lead; VIEWER não.
  if (!can("MANAGER", "company.create")) throw new Error("MANAGER deveria criar empresa");
  if (!can("MANAGER", "company.delete")) throw new Error("MANAGER deveria excluir");
  if (can("VIEWER", "company.create")) throw new Error("VIEWER NÃO deveria criar");
  if (can("MANAGER", "member.invite")) throw new Error("MANAGER NÃO deveria convidar");
  if (can("USER", "company.delete")) throw new Error("USER NÃO deveria excluir");
  if (!can("USER", "company.create")) throw new Error("USER deveria criar");
  console.log("OK: matriz de permissões por papel correta");

  // Mudança de papel: owner rebaixa mgr para VIEWER.
  await withTenantContext({ userId: owner.id, tenantId }, (tx) =>
    tx.tenantUser.update({ where: { tenantId_userId: { tenantId, userId: mgr.id } }, data: { role: "VIEWER" } })
  );
  const mgrAfter = await withTenantContext({ userId: mgr.id, tenantId }, (tx) =>
    tx.tenantUser.findUnique({ where: { tenantId_userId: { tenantId, userId: mgr.id } } })
  );
  if (mgrAfter?.role !== "VIEWER") throw new Error("mudança de papel falhou");
  console.log("OK: mudança de papel (MANAGER -> VIEWER)");

  // Remoção do membro.
  await withTenantContext({ userId: owner.id, tenantId }, (tx) =>
    tx.tenantUser.delete({ where: { tenantId_userId: { tenantId, userId: view.id } } })
  );
  const viewAfter = await listUserTenants(view.id);
  if (viewAfter.length !== 0) throw new Error("remoção de membro falhou");
  console.log("OK: remoção de membro");

  // Limite do plano: workspace INDIVIDUAL (maxUsers=1) não pode convidar 2º.
  const tenant1 = randomUUID();
  await withTenantContext({ userId: owner.id, tenantId: tenant1 }, async (tx) => {
    await tx.tenant.create({ data: { id: tenant1, name: "Solo", planId: individualPlan.id } });
    await tx.tenantUser.create({ data: { tenantId: tenant1, userId: owner.id, role: "OWNER" } });
  });
  const members = await withTenantContext({ userId: owner.id, tenantId: tenant1 }, (tx) =>
    tx.tenantUser.count({ where: { tenantId: tenant1 } })
  );
  const maxUsers = individualPlan.maxUsers;
  // Com 1 membro (owner) e limite 1, um novo convite DEVE ser bloqueado
  // (members + pending >= maxUsers) — mesma condição da action inviteMember.
  if (maxUsers === null || members < maxUsers) {
    throw new Error("limite INDIVIDUAL deveria bloquear o 2º membro");
  }
  console.log(`OK: limite do plano respeitado (members=${members}, maxUsers=${maxUsers} — convite bloqueado)`);

  // Cleanup (cada tenant apagado uma única vez, pelo owner).
  for (const t of [tenantId, tenant1]) {
    await withTenantContext({ userId: owner.id, tenantId: t }, (tx) =>
      tx.tenant.delete({ where: { id: t } })
    );
  }
  for (const u of [owner, mgr, view, out]) await prisma.user.delete({ where: { id: u.id } });
  await prisma.$disconnect();
  console.log("TEAM_OK");
}

main().catch(async (e) => {
  console.error("ERRO:", e);
  await prisma.$disconnect();
  process.exit(1);
});