"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/session";
import { withTenantContext } from "@/core/tenancy/tenancy";

const ACTIVE_TENANT_COOKIE = "active_tenant";

function setActiveTenantCookie(tenantId: string) {
  return cookies().then((cookieStore) =>
    cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 ano
    })
  );
}

/** Cria um workspace (tenant) e vincula o criador como OWNER. */
export async function createWorkspace(formData: FormData) {
  const user = await getServerUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Informe o nome da empresa.");

  // O plano vem SEMPRE do servidor (INDIVIDUAL até existir pagamento).
  // Nunca confiar em plano vindo do cliente: cada plano define limites
  // (membros/empresas/contatos/leads), então aceitar um plano arbitrário
  // seria um "free upgrade".
  const plan = await prisma.plan.findUnique({ where: { key: "INDIVIDUAL" } });
  if (!plan) throw new Error("Plano não encontrado.");

  // O id é gerado ANTES para podermos definir app.tenant_id = id e a policy do
  // `tenants` (WITH CHECK: id = app.tenant_id) permitir a criação.
  const tenantId = randomUUID();
  await withTenantContext({ userId: user.id, tenantId }, async (tx) => {
    await tx.tenant.create({ data: { id: tenantId, name, planId: plan.id } });
    await tx.tenantUser.create({
      data: { tenantId, userId: user.id, role: "OWNER" },
    });
    await tx.domainEvent.create({
      data: {
        tenantId,
        userId: user.id,
        type: "tenant.created",
        payload: { name, planKey: "INDIVIDUAL" },
      },
    });
  });

  await setActiveTenantCookie(tenantId);
  revalidatePath("/dashboard");
}

/** Troca o workspace ativo (valida que o usuário pertence a ele). */
export async function selectWorkspace(formData: FormData) {
  const user = await getServerUser();
  const tenantId = String(formData.get("tenantId") ?? "").trim();
  if (!tenantId) throw new Error("Selecione uma empresa.");

  // Checagem de autorização dentro do contexto do tenant alvo (RLS + código).
  const membership = await withTenantContext(
    { userId: user.id, tenantId },
    (tx) =>
      tx.tenantUser.findUnique({
        where: { tenantId_userId: { tenantId, userId: user.id } },
      })
  );
  if (!membership) throw new Error("Você não pertence a essa empresa.");

  await setActiveTenantCookie(tenantId);
  revalidatePath("/dashboard");
}