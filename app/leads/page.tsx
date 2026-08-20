import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionWorkspace } from "@/lib/session";
import { withTenant } from "@/core/tenancy/tenancy";
import { can } from "@/core/permissions/access";
import { PIPELINE_STAGES, type PipelineStage, type Role } from "@shared/index";
import LeadForm from "./LeadForm";
import LeadCardControls from "./LeadCardControls";

function formatBRL(value: string | null) {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { active } = await getSessionWorkspace();
  if (!active) redirect("/dashboard");

  const { edit } = await searchParams;

  const [leads, contacts, editing] = await Promise.all([
    withTenant(active.tenantId, (tx) =>
      tx.crmLead.findMany({ include: { contact: true }, orderBy: { createdAt: "desc" } })
    ),
    withTenant(active.tenantId, (tx) =>
      tx.crmContact.findMany({ orderBy: { name: "asc" } })
    ),
    edit
      ? withTenant(active.tenantId, (tx) =>
          tx.crmLead.findUnique({ where: { id: edit }, include: { contact: true } })
        )
      : Promise.resolve(null),
  ]);

  const grouped = Object.fromEntries(
    PIPELINE_STAGES.map((s) => [s, leads.filter((l) => l.stage === s)])
  ) as Record<PipelineStage, typeof leads>;

  const maxLeads = active.tenant.plan.maxLeads;
  const role = active.role as Role;
  const canCreate = can(role, "lead.create");
  const canUpdate = can(role, "lead.update");
  const canDelete = can(role, "lead.delete");
  const canMove = can(role, "lead.move");
  const totalValue = leads
    .filter((l) => l.stage === "GANHO" && l.value)
    .reduce((acc, l) => acc + Number(l.value), 0);

  const toPlain = (l: (typeof leads)[number]) => ({
    id: l.id,
    contactId: l.contactId,
    stage: l.stage as PipelineStage,
    value: l.value ? l.value.toString() : null,
    probability: l.probability,
    origin: l.origin,
    notes: l.notes,
  });

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
          <h1 className="font-semibold text-zinc-900 dark:text-zinc-50">Leads</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Ganhos: {formatBRL(totalValue.toFixed(2)) ?? "R$ 0,00"}
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {active.tenant.name}
          </span>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Funil de vendas</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {maxLeads === null
                  ? "Sem limite de leads no seu plano."
                  : `${leads.length} de ${maxLeads} lead(s) usado(s) no seu plano.`}
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Cadastro / edição */}
            {canCreate && (
              <aside className="lg:col-span-1">
                <section className="sticky top-6 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {editing ? "Editar lead" : "Novo lead"}
                  </h3>
                  <p className="mb-4 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {editing
                      ? `Alterando o lead de "${editing.contact.name}".`
                      : contacts.length === 0
                        ? "Cadastre um contato antes de criar leads."
                        : "Preencha e clique em cadastrar."}
                  </p>
                  {editing && canUpdate ? (
                    <>
                      <LeadForm
                        mode="edit"
                        lead={toPlain(editing)}
                        contacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
                      />
                      <Link
                        href="/leads"
                        className="mt-3 inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                      >
                        Cancelar edição
                      </Link>
                    </>
                  ) : (
                    <LeadForm
                      mode="create"
                      contacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
                    />
                  )}
                </section>
              </aside>
            )}

            {/* Kanban por estágio */}
            <section className="lg:col-span-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {PIPELINE_STAGES.map((stage) => (
                  <div
                    key={stage}
                    className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {stage}
                      </h4>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {grouped[stage].length}
                      </span>
                    </div>
                    {grouped[stage].length === 0 ? (
                      <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
                        Vazio
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {grouped[stage].map((l) => {
                          const value = formatBRL(l.value ? l.value.toString() : null);
                          return (
                            <li
                              key={l.id}
                              className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                            >
                              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                                {l.contact.name}
                              </p>
                              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                {[value, l.origin, l.probability != null ? `${l.probability}%` : null]
                                  .filter(Boolean)
                                  .join(" · ") || "Sem dados"}
                              </p>
                              {l.notes && (
                                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                                  {l.notes}
                                </p>
                              )}
                              <LeadCardControls
                                leadId={l.id}
                                stage={l.stage as PipelineStage}
                                contactName={l.contact.name}
                                editHref={`/leads?edit=${l.id}`}
                                canMove={canMove}
                                canEdit={canUpdate}
                                canDelete={canDelete}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}