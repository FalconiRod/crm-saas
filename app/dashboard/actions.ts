"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/session";
import { withTenantContext } from "@/core/tenancy/tenancy";
import type { PlanKey } from "@shared/index";

const ACTIVE_TENANT_COOKIE = "active_tenant";

function setActiveTenantCookie(tenantId: string) {
  return cookies().then((cookieStore) =>
    cookieStore.set(ACTIVE_TENANT_COOKIE, tenantId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 ano
    })
  );
}

/** Cria um workspace (tenant) e vincula o criador como OWNER. */
export async function createWorkspace(formData: FormData) {
  const user = await getServerUser();
  const name = String(formData.get("name") ?? "").trim();
  const planKey = String(formData.get("plan") ?? "INDIVIDUAL") as PlanKey;
  if (!name) throw new Error("Informe o nome da empresa.");

  const plan = await prisma.plan.findUnique({ where: { key: planKey } });
  if (!plan) throw new Error("Plano inválido.");

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
        payload: { name, planKey },
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