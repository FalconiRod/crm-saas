import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionWorkspace } from "@/lib/session";
import { withTenant } from "@/core/tenancy/tenancy";
import { can, INVITABLE_ROLES } from "@/core/permissions/access";
import type { Role } from "@shared/index";
import InviteForm from "./InviteForm";
import MemberActions from "./MemberActions";
import RevokeInvitation from "./RevokeInvitation";

const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Dono",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  USER: "Membro",
  VIEWER: "Somente leitura",
};

export default async function TeamPage() {
  const { user, active } = await getSessionWorkspace();
  if (!active) redirect("/dashboard");

  const [members, invitations] = await Promise.all([
    withTenant(active.tenantId, (tx) =>
      tx.tenantUser.findMany({ include: { user: true }, orderBy: { role: "asc" } })
    ),
    withTenant(active.tenantId, (tx) =>
      tx.invitation.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } })
    ),
  ]);

  const maxUsers = active.tenant.plan.maxUsers;
  const role = active.role as Role;
  const canInvite = can(role, "member.invite");
  const canManage = can(role, "member.updateRole");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← Painel
          </Link>
          <span className="text-sm text-zinc-400 dark:text-zinc-500">|</span>
          <h1 className="font-semibold text-zinc-900 dark:text-zinc-50">Equipe</h1>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {active.tenant.name}
        </span>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Membros</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {maxUsers === null
                  ? "Sem limite de membros no seu plano."
                  : `${members.length} de ${maxUsers} membro(s) no seu plano.`}
              </p>
            </div>
          </div>

          {canInvite && (
            <section className="mt-8 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Convidar membro</h3>
              <p className="mb-4 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                A pessoa entra com a conta dela (e-mail/Clerk) e o convite é aceito automaticamente.
              </p>
              <InviteForm
                maxReached={maxUsers !== null && members.length + invitations.length >= maxUsers}
              />
            </section>
          )}

          <section className="mt-8 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Membros ativos</h3>
            {members.map((m) => {
              const isOwner = m.role === "OWNER";
              const isSelf = m.userId === user.id;
              return (
                <div
                  key={m.userId}
                  className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {m.user.name}
                        {isSelf && (
                          <span className="ml-2 text-xs font-medium text-zinc-400">(você)</span>
                        )}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{m.user.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isOwner
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {ROLE_LABEL[m.role as Role]}
                      </span>
                      {canManage && !isOwner && (
                        <MemberActions
                          userId={m.userId}
                          memberName={m.user.name}
                          currentRole={m.role as Role}
                          roles={INVITABLE_ROLES}
                          roleLabels={ROLE_LABEL}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          {invitations.length > 0 && canInvite && (
            <section className="mt-8 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                Convites pendentes ({invitations.length})
              </h3>
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="rounded-2xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">{inv.email}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Papel: {ROLE_LABEL[inv.role as Role]} · aguardando aceite
                      </p>
                    </div>
                    <RevokeInvitation invitationId={inv.id} email={inv.email} />
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}