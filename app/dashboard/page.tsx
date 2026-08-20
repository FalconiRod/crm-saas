import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/clerk";
import { getSessionWorkspace } from "@/lib/session";
import { withTenant } from "@/core/tenancy/tenancy";
import { PIPELINE_STAGES, type PipelineStage } from "@shared/index";
import SetupRequired from "@/components/SetupRequired";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { createWorkspace } from "./actions";

function formatBRL(value: string | null) {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  if (!clerkEnabled) return <SetupRequired />;

  const { user, memberships, active } = await getSessionWorkspace();

  // ---- Nenhum workspace ainda: tela de criação ----
  if (!active) {
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
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Plano Individual incluído por enquanto (1 membro, até 5 empresas). Assinatura
              será liberada em breve.
            </p>
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
  const { p } = await searchParams;
  const periodDays = p === "7" || p === "30" || p === "90" ? Number(p) : null;
  // eslint-disable-next-line react-hooks/purity -- Server Component: corte do período por request
  const since = periodDays ? new Date(Date.now() - periodDays * 86400000) : null;
  const sinceFilter = since ? { gte: since } : undefined;

  const stats = await withTenant(active.tenantId, async (tx) => {
    const [companies, contacts, leads, recentLeads] = await Promise.all([
      tx.crmCompany.count({ where: sinceFilter ? { createdAt: sinceFilter } : undefined }),
      tx.crmContact.count({ where: sinceFilter ? { createdAt: sinceFilter } : undefined }),
      tx.crmLead.findMany({
        where: sinceFilter ? { createdAt: sinceFilter } : undefined,
        select: { id: true, stage: true, value: true, createdAt: true, contact: { select: { name: true } } },
      }),
      tx.crmLead.findMany({
        include: { contact: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);
    return { companies, contacts, leads, recentLeads };
  });

  const total = stats.leads.length;
  const byStage = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s, stats.leads.filter((l) => l.stage === s).length])
  ) as Record<PipelineStage, number>;
  const ganhos = stats.leads
    .filter((l) => l.stage === "GANHO" && l.value)
    .reduce((acc, l) => acc + Number(l.value), 0);
  const ganhoCount = byStage.GANHO;
  const conversao = total > 0 ? Math.round((ganhoCount / total) * 100) : 0;
  const abertos = total - ganhoCount - byStage.PERDIDO;
  const maxStage = Math.max(1, ...PIPELINE_STAGES.map((s) => byStage[s]));

  const planName = active.tenant.plan.name;
  const isOwner = active.role === "OWNER";
  const periodLabel = periodDays ? `últimos ${periodDays} dias` : "todo o período";

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
          <nav className="flex items-center gap-2">
            <Link
              href="/companies"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Empresas
            </Link>
            <Link
              href="/contacts"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Contatos
            </Link>
            <Link
              href="/leads"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Leads
            </Link>
            <Link
              href="/tasks"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Tarefas
            </Link>
            <Link
              href="/team"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Equipe
            </Link>
            <Link
              href="/settings"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Configurações
            </Link>
          </nav>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Painel de {active.tenant.name}
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Resumo do seu CRM em {periodLabel}.
              </p>
            </div>
            <nav className="flex items-center gap-1 rounded-full border border-zinc-200 p-1 dark:border-zinc-800">
              {[
                { label: "7d", value: "7" },
                { label: "30d", value: "30" },
                { label: "90d", value: "90" },
                { label: "Tudo", value: "" },
              ].map((opt) => (
                <Link
                  key={opt.value || "all"}
                  href={opt.value ? `/dashboard?p=${opt.value}` : "/dashboard"}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    (periodDays?.toString() ?? "") === opt.value
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Cartões principais */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { t: "Empresas", v: stats.companies },
              { t: "Contatos", v: stats.contacts },
              { t: "Leads", v: total },
              { t: "Ganhos", v: formatBRL(ganhos.toFixed(2)), accent: true },
              { t: "Conversão", v: `${conversao}%` },
            ].map((f) => (
              <div
                key={f.t}
                className={`rounded-2xl border p-5 dark:border-zinc-800 ${
                  f.accent
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40"
                    : "border-zinc-200"
                }`}
              >
                <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  {f.t}
                </h2>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {f.v}
                </p>
              </div>
            ))}
          </div>

          {/* Funil por estágio */}
          <section className="mt-8 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Funil de vendas</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {abertos} em aberto · {byStage.PERDIDO} perdidos
              </p>
            </div>
            <div className="mt-5 space-y-3">
              {PIPELINE_STAGES.map((stage) => {
                const count = byStage[stage];
                const pct = Math.round((count / maxStage) * 100);
                const color =
                  stage === "GANHO"
                    ? "bg-emerald-500"
                    : stage === "PERDIDO"
                      ? "bg-red-500"
                      : "bg-zinc-800 dark:bg-zinc-200";
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm text-zinc-600 dark:text-zinc-400">
                      {stage}
                    </span>
                    <div className="h-6 flex-1 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
                      <div
                        className={`h-full rounded-lg transition-all ${color}`}
                        style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Leads recentes */}
          <section className="mt-8 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Leads recentes</h2>
            {stats.recentLeads.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                Nenhum lead ainda. Cadastre um na página de Leads.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-900">
                {stats.recentLeads.map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {l.contact.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {l.stage}
                        {l.origin ? ` · ${l.origin}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {l.value ? formatBRL(l.value.toString()) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}