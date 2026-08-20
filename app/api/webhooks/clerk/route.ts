import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { prisma } from "@/lib/prisma";

// Webhook do Clerk: mantém a tabela `users` sincronizada com a conta do Clerk.
// Endpoint: /api/webhooks/clerk (configurar no painel do Clerk, seção Webhooks,
// com os eventos user.created, user.updated, user.deleted).
// A rota é pública, mas a assinatura (signing secret) é verificada em cada
// requisição — sem ela, nada passa.

export async function POST(request: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(request);
  } catch (err) {
    console.error("[clerk-webhook] verificação de assinatura falhou:", err);
    return new Response("Verificação falhou", { status: 400 });
  }

  const { type } = evt;

  if (type === "user.created" || type === "user.updated") {
    const u = evt.data;
    const primary =
      u.email_addresses.find((e) => e.id === u.primary_email_address_id) ??
      u.email_addresses[0];
    const email = primary?.email_address ?? `clerk_${u.id}@local`;
    const name =
      [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
      u.username ||
      email;

    // upsert: cria no primeiro login e atualiza nas alterações do perfil.
    // `authProviderId` guarda o id do usuário no Clerk (chave única).
    await prisma.user.upsert({
      where: { authProviderId: u.id },
      create: { authProviderId: u.id, email, name },
      update: { email, name },
    });
    return new Response("OK", { status: 200 });
  }

  if (type === "user.deleted") {
    // Apaga o usuário local. Se já tiver vínculos (tenant_users, etc.), o
    // delete falha por FK — nesse caso só registra e deixa o vínculo inativo
    // manualmente (MVP: logar é suficiente).
    try {
      const result = await prisma.user.deleteMany({
        where: { authProviderId: evt.data.id },
      });
      console.log("[clerk-webhook] usuário removido:", result.count);
    } catch (err) {
      console.error("[clerk-webhook] falha ao remover usuário (FK?):", err);
    }
    return new Response("OK", { status: 200 });
  }

  return new Response("Ignorado", { status: 200 });
}