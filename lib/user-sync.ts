import { prisma } from "@/lib/prisma";

// Cria/atualiza a linha de `users` a partir de um usuário do Clerk.
// Usado pelo webhook (/api/webhooks/clerk) E pelo painel (garante que o
// usuário exista mesmo se o webhook ainda não estiver configurado).
// O id do Clerk fica em `auth_provider_id` (chave única); `users.id` é o nosso
// cuid. O upsert é idempotente — nunca duplica o usuário.
export async function upsertUserFromClerk({
  id,
  firstName,
  lastName,
  username,
  email,
}: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
}) {
  const emailValue = email?.trim() || `clerk_${id}@local`;
  const name =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    username ||
    emailValue;

  return prisma.user.upsert({
    where: { authProviderId: id },
    create: { authProviderId: id, email: emailValue, name },
    update: { email: emailValue, name },
  });
}