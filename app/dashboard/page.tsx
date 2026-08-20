import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { prisma } from "@/lib/prisma";
import { clerkEnabled } from "@/lib/clerk";
import { getSessionWorkspace } from "@/lib/session";
import { withTenant } from "@/core/tenancy/tenancy";
import SetupRequired from "@/components/SetupRequired";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { createWorkspace } from "./actions";

function formatPrice(cents: number) {
  if (cents === 0) return "Grátis";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}/mês`;
}

export default async function DashboardPage() {
  if (!clerkEnabled) return <SetupRequired />;

  const { user, memberships, active } = await getSessionWorkspace();

  // ---- Nenhum workspace ainda: tela de criação ----
  if (!active) {
    const plans = await prisma.plan.findMany({ orderBy: { priceCents: "asc" } });
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-black">
        <div className="w-full max-w-md">
          <h1 className="text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Bem-vindo, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Para começar, crie o seu espaço de trabalho (empresa). Os dados que
            você cadastrar ficam isolados por empresa.
          </p>
          <form
            action={createWorkspace}
            className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Nome da empresa
              </label>
              <input
                id="name"
                name="name"
                required
                placeholder="Ex.: Minha Consultoria"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label
                htmlFor="plan"
                className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Plano
              </label>
              <select
                id="plan"
                name="plan"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.key}>
                    {p.name} — {formatPrice(p.priceCents)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
            >
              Criar empresa
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ---- Tem workspace: dados com escopo RLS do tenant ativo ----
  const stats = await withTenant(active.tenantId, async (tx) => {
    const [companies, contacts, leads] = await Promise.all([
      tx.crmCompany.count(),
      tx.crmContact.count(),
      tx.crmLead.count(),
    ]);
    return { companies, contacts, leads };
  });

  const planName = active.tenant.plan.name;
  const isOwner = active.role === "OWNER";

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
          {memberships.length > 1 ? (
            <WorkspaceSwitcher
              memberships={memberships.map((m) => ({
                tenantId: m.tenantId,
                tenantName: m.tenant.name,
              }))}
              activeTenantId={active.tenantId}
            />
          ) : (
            <span className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
              {active.tenant.name}
            </span>
          )}
          <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {planName}
          </span>
          {isOwner && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Dono
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/companies"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
          >
            Empresas
          </Link>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Painel de {active.tenant.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Resumo do seu CRM. As próximas fases liberam cada módulo.
        </p>

        <div className="mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { t: "Empresas", v: stats.companies, d: "Cadastro de empresas-clientes" },
            { t: "Contatos", v: stats.contacts, d: "Agenda por empresa" },
            { t: "Leads", v: stats.leads, d: "Funil de vendas" },
          ].map((f) => (
            <div
              key={f.t}
              className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
                {f.t}
              </h2>
              <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                {f.v}
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {f.d}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}