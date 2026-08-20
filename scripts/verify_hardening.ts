// Smoke test da Fase 10 (hardening de RLS + settings do workspace).
// Verifica que o BANCO (não só o app) bloqueia:
//  • auto-promoção a OWNER e rebaixar o dono;
//  • renomear/excluir o tenant por quem não é OWNER;
//  • o convidado mexer no próprio convite (tamper de papel);
//  • membro convidar (INSERT em invitations exige OWNER/ADMIN);
//  • entrar no workspace com papel diferente do convite.
// E que o OWNER consegue: renomear, mudar papel, remover e excluir (cascata).
import "dotenv/config";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { listUserTenants, withTenantContext } from "../core/tenancy/tenancy";

const EMAIL_OWNER = "rls_hard_owner@example.com";
const EMAIL_MEMBER = "rls_hard_member@example.com";
const EMAIL_INVITEE = "rls_hard_invitee@example.com";

async function expectError(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
  } catch {
    return; // erro (RLS / P2025) = comportamento esperado
  }
  throw new Error(`${label}: deveria ter sido BLOQUEADO pelo RLS`);
}

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: EMAIL_OWNER },
    create: { name: "Hard Owner", email: EMAIL_OWNER },
    update: {},
  });
  const member = await prisma.user.upsert({
    where: { email: EMAIL_MEMBER },
    create: { name: "Hard Member", email: EMAIL_MEMBER },
    update: {},
  });
  const invitee = await prisma.user.upsert({
    where: { email: EMAIL_INVITEE },
    create: { name: "Hard Invitee", email: EMAIL_INVITEE },
    update: {},
  });
  const teamPlan = await prisma.plan.findFirst({ where: { key: "TEAM" } });
  if (!teamPlan) throw new Error("plano TEAM ausente");

  for (const u of [owner, member, invitee]) {
    for (const m of await listUserTenants(u.id)) {
      await withTenantContext({ userId: u.id, tenantId: m.tenantId }, (tx) =>
        tx.tenant.delete({ where: { id: m.tenantId } })
      );
    }
  }

  const tenantId = randomUUID();
  await withTenantContext({ userId: owner.id, tenantId }, async (tx) => {
    await tx.tenant.create({ data: { id: tenantId, name: "Hardening", planId: teamPlan.id } });
    await tx.tenantUser.create({ data: { tenantId, userId: owner.id, role: "OWNER" } });
  });
  console.log("OK: workspace criado (owner)");

  // Convites do owner: member (USER) e invitee (VIEWER).
  await withTenantContext({ userId: owner.id, tenantId }, (tx) =>
    tx.invitation.createMany({
      data: [
        { tenantId, email: EMAIL_MEMBER, role: "USER", invitedBy: owner.id },
        { tenantId, email: EMAIL_INVITEE, role: "VIEWER", invitedBy: owner.id },
      ],
    })
  );
  // member aceita (vira USER pelo convite).
  await withTenantContext({ userId: member.id, tenantId, email: EMAIL_MEMBER }, async (tx) => {
    const existing = await tx.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId: member.id } },
    });
    if (!existing) await tx.tenantUser.create({ data: { tenantId, userId: member.id, role: "USER" } });
  });
  console.log("OK: member aceitou como USER");

  // 1) member não pode se auto-promover a OWNER.
  await expectError(
    () =>
      withTenantContext({ userId: member.id, tenantId }, (tx) =>
        tx.tenantUser.update({
          where: { tenantId_userId: { tenantId, userId: member.id } },
          data: { role: "OWNER" },
        })
      ),
    "auto-promoção a OWNER"
  );
  console.log("OK: auto-promoção a OWNER bloqueada pelo RLS");

  // 2) member não pode rebaixar o dono.
  await expectError(
    () =>
      withTenantContext({ userId: member.id, tenantId }, (tx) =>
        tx.tenantUser.update({
          where: { tenantId_userId: { tenantId, userId: owner.id } },
          data: { role: "VIEWER" },
        })
      ),
    "rebaixar o dono"
  );
  console.log("OK: rebaixar o dono bloqueado pelo RLS");

  // 3) member não pode renomear o tenant.
  await expectError(
    () =>
      withTenantContext({ userId: member.id, tenantId }, (tx) =>
        tx.tenant.update({ where: { id: tenantId }, data: { name: "hacked" } })
      ),
    "renomear tenant"
  );
  console.log("OK: renomear tenant por member bloqueado pelo RLS");

  // 4) member não pode excluir o tenant.
  await expectError(
    () =>
      withTenantContext({ userId: member.id, tenantId }, (tx) =>
        tx.tenant.delete({ where: { id: tenantId } })
      ),
    "excluir tenant"
  );
  console.log("OK: excluir tenant por member bloqueado pelo RLS");

  // 5) invitee não pode alterar o próprio convite (trocar papel para OWNER).
  await withTenantContext({ email: EMAIL_INVITEE }, (tx) =>
    tx.invitation.updateMany({
      where: { email: EMAIL_INVITEE, status: "PENDING" },
      data: { role: "OWNER" },
    })
  );
  const tampered = await withTenantContext({ userId: owner.id, tenantId }, (tx) =>
    tx.invitation.findFirst({ where: { tenantId, email: EMAIL_INVITEE } })
  );
  if (!tampered || tampered.role !== "VIEWER")
    throw new Error("invitee conseguiu alterar o próprio convite (tamper)");
  console.log("OK: tamper do convite bloqueado pelo RLS (papel continua VIEWER)");

  // 6) member não pode convidar (INSERT em invitations exige OWNER/ADMIN).
  await expectError(
    () =>
      withTenantContext({ userId: member.id, tenantId }, (tx) =>
        tx.invitation.create({
          data: { tenantId, email: "x@example.com", role: "VIEWER", invitedBy: member.id },
        })
      ),
    "convidar como member"
  );
  console.log("OK: convidar por member bloqueado pelo RLS");

  // 7) invitee não pode entrar com papel diferente do convite (OWNER).
  await expectError(
    () =>
      withTenantContext({ userId: invitee.id, tenantId, email: EMAIL_INVITEE }, (tx) =>
        tx.tenantUser.create({ data: { tenantId, userId: invitee.id, role: "OWNER" } })
      ),
    "entrar como OWNER"
  );
  console.log("OK: entrar com papel diferente do convite bloqueado pelo RLS");

  // 8) owner renomeia o tenant (settings).
  await withTenantContext({ userId: owner.id, tenantId }, (tx) =>
    tx.tenant.update({ where: { id: tenantId }, data: { name: "Hardening Renomeado" } })
  );
  const renamed = await withTenantContext({ userId: owner.id, tenantId }, (tx) =>
    tx.tenant.findUnique({ where: { id: tenantId } })
  );
  if (renamed?.name !== "Hardening Renomeado") throw new Error("renomear pelo owner falhou");
  console.log("OK: renomear pelo owner permitido");

  // 9) owner muda papel e remove membro.
  await withTenantContext({ userId: owner.id, tenantId }, (tx) =>
    tx.tenantUser.update({
      where: { tenantId_userId: { tenantId, userId: member.id } },
      data: { role: "MANAGER" },
    })
  );
  await withTenantContext({ userId: owner.id, tenantId }, (tx) =>
    tx.tenantUser.delete({ where: { tenantId_userId: { tenantId, userId: member.id } } })
  );
  console.log("OK: mudar papel / remover pelo owner permitido");

  // 10) invitee aceita corretamente (vira VIEWER pelo convite).
  await withTenantContext({ userId: invitee.id, tenantId, email: EMAIL_INVITEE }, async (tx) => {
    const existing = await tx.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId: invitee.id } },
    });
    if (!existing) await tx.tenantUser.create({ data: { tenantId, userId: invitee.id, role: "VIEWER" } });
  });
  const inv = await withTenantContext({ userId: owner.id, tenantId }, (tx) =>
    tx.tenantUser.findUnique({ where: { tenantId_userId: { tenantId, userId: invitee.id } } })
  );
  if (!inv || inv.role !== "VIEWER") throw new Error("aceite com papel do convite falhou");
  console.log("OK: aceite com papel do convite (VIEWER)");

  // Cleanup: owner exclui o tenant (cascata remove tudo).
  await withTenantContext({ userId: owner.id, tenantId }, (tx) =>
    tx.tenant.delete({ where: { id: tenantId } })
  );
  const ghost = await withTenantContext({ userId: owner.id, tenantId }, (tx) =>
    tx.tenant.findUnique({ where: { id: tenantId } })
  );
  if (ghost) throw new Error("exclusão em cascata falhou");
  console.log("OK: exclusão do tenant pelo owner (cascata)");

  for (const u of [owner, member, invitee]) await prisma.user.delete({ where: { id: u.id } });
  await prisma.$disconnect();
  console.log("HARDENING_OK");
}

main().catch(async (e) => {
  console.error("ERRO:", e);
  await prisma.$disconnect();
  process.exit(1);
});