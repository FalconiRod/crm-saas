import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionWorkspace } from "@/lib/session";
import { withTenant } from "@/core/tenancy/tenancy";
import { can } from "@/core/permissions/access";
import type { Role } from "@shared/index";
import TaskForm from "./TaskForm";
import TaskActions from "./TaskActions";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { active } = await getSessionWorkspace();
  if (!active) redirect("/dashboard");

  const { s } = await searchParams;
  const filter = s === "pending" || s === "done" ? s : "all";

  const { tasks, contacts, leads, members } = await withTenant(active.tenantId, async (tx) => {
    const where =
      filter === "pending"
        ? { status: "PENDING" as const }
        : filter === "done"
          ? { status: "DONE" as const }
          : undefined;
    const [tasks, contacts, leads, members] = await Promise.all([
      tx.crmTask.findMany({
        where,
        include: { contact: true, lead: { include: { contact: true } }, assignee: true },
        orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      }),
      tx.crmContact.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      tx.crmLead.findMany({
        select: { id: true, contact: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      tx.tenantUser.findMany({ include: { user: true } }),
    ]);
    return { tasks, contacts, leads, members };
  });

  const role = active.role as Role;
  const canCreate = can(role, "task.create");
  const canUpdate = can(role, "task.update");
  const canDelete = can(role, "task.delete");
  // eslint-disable-next-line react-hooks/purity -- Server Component: comparação de vencimento por request
  const now = Date.now();

  const leadOptions = leads.map((l) => ({ id: l.id, name: l.contact.name }));
  const memberOptions = members.map((m) => ({ id: m.userId, name: m.user.name }));

  const filters = [
    { key: "all", label: `Todas (${tasks.length})` },
    { key: "pending", label: "Pendentes" },
    { key: "done", label: "Concluídas" },
  ];

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
          <h1 className="font-semibold text-zinc-900 dark:text-zinc-50">Tarefas</h1>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {active.tenant.name}
        </span>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Tarefas</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Lembretes e atividades do seu dia a dia de vendas.
              </p>
            </div>
            <nav className="flex items-center gap-1 rounded-full border border-zinc-200 p-1 dark:border-zinc-800">
              {filters.map((f) => (
                <Link
                  key={f.key}
                  href={f.key === "all" ? "/tasks" : `/tasks?s=${f.key}`}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    filter === f.key
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  }`}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
            {canCreate && (
              <section className="rounded-2xl border border-zinc-200 p-6 lg:col-span-2 dark:border-zinc-800">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Nova tarefa</h3>
                <p className="mb-4 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Vincule a um contato ou lead para não perder o contexto.
                </p>
                <TaskForm
                  contacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
                  leads={leadOptions}
                  members={memberOptions}
                />
              </section>
            )}

            <section className={canCreate ? "lg:col-span-3" : "lg:col-span-5"}>
              {tasks.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {filter === "pending"
                      ? "Nenhuma tarefa pendente. Boa!"
                      : filter === "done"
                        ? "Nenhuma tarefa concluída ainda."
                        : "Nenhuma tarefa cadastrada ainda.\nUse o formulário ao lado para criar a primeira."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {tasks.map((t) => {
                    const overdue =
                      t.status === "PENDING" && t.dueAt && t.dueAt.getTime() < now;
                    return (
                      <li
                        key={t.id}
                        className={`rounded-2xl border p-5 dark:border-zinc-800 ${
                          t.status === "DONE"
                            ? "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40"
                            : "border-zinc-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4
                                className={`font-semibold ${
                                  t.status === "DONE"
                                    ? "text-zinc-400 line-through dark:text-zinc-500"
                                    : "text-zinc-900 dark:text-zinc-50"
                                }`}
                              >
                                {t.title}
                              </h4>
                              {overdue && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                                  Atrasada
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                              {[
                                t.dueAt ? `Vence em ${toLocalInput(t.dueAt).replace("T", " às ")}` : null,
                                t.contact ? `Contato: ${t.contact.name}` : null,
                                t.lead ? `Lead: ${t.lead.contact.name}` : null,
                                t.assignee ? `Responsável: ${t.assignee.name}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "Sem detalhes adicionais"}
                            </p>
                            {t.notes && (
                              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{t.notes}</p>
                            )}
                          </div>
                          {canUpdate && (
                            <TaskActions
                              taskId={t.id}
                              title={t.title}
                              done={t.status === "DONE"}
                              canDelete={canDelete}
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}