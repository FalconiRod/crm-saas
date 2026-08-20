import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionWorkspace } from "@/lib/session";
import { withTenant } from "@/core/tenancy/tenancy";
import { can } from "@/core/permissions/access";
import type { Role } from "@shared/index";
import ContactForm from "./ContactForm";
import DeleteContactButton from "./DeleteContact";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; q?: string }>;
}) {
  const { active } = await getSessionWorkspace();
  if (!active) redirect("/dashboard");

  const { edit, q } = await searchParams;
  const query = (q ?? "").trim();

  const [contacts, companies, editing] = await Promise.all([
    withTenant(active.tenantId, (tx) =>
      tx.crmContact.findMany({
        where: query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { phone: { contains: query, mode: "insensitive" } },
              ],
            }
          : undefined,
        include: { crmCompany: true },
        orderBy: { createdAt: "desc" },
      })
    ),
    withTenant(active.tenantId, (tx) =>
      tx.crmCompany.findMany({ orderBy: { name: "asc" } })
    ),
    edit
      ? withTenant(active.tenantId, (tx) =>
          tx.crmContact.findUnique({ where: { id: edit } })
        )
      : Promise.resolve(null),
  ]);

  const maxContacts = active.tenant.plan.maxContacts;
  const role = active.role as Role;
  const canCreate = can(role, "contact.create");
  const canUpdate = can(role, "contact.update");
  const canDelete = can(role, "contact.delete");

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
          <h1 className="font-semibold text-zinc-900 dark:text-zinc-50">Contatos</h1>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {active.tenant.name}
        </span>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                Contatos
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {maxContacts === null
                  ? "Sem limite de contatos no seu plano."
                  : `${contacts.length} de ${maxContacts} contato(s) usado(s) no seu plano.`}
              </p>
            </div>
            <form method="get" className="flex items-center gap-2">
              <input
                name="q"
                defaultValue={query}
                placeholder="Buscar por nome, e-mail ou telefone"
                className="w-64 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
              >
                Buscar
              </button>
            </form>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Cadastro / edição */}
            {canCreate && (
              <section className="rounded-2xl border border-zinc-200 p-6 lg:col-span-2 dark:border-zinc-800">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {editing ? "Editar contato" : "Novo contato"}
                </h3>
                <p className="mb-4 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {editing
                    ? `Alterando "${editing.name}".`
                    : "Preencha os dados e clique em cadastrar."}
                </p>
                {editing && canUpdate ? (
                  <>
                    <ContactForm
                      mode="edit"
                      contact={editing}
                      companies={companies.map((c) => ({ id: c.id, name: c.name }))}
                    />
                    <Link
                      href="/contacts"
                      className="mt-3 inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      Cancelar edição
                    </Link>
                  </>
                ) : (
                  <ContactForm
                    mode="create"
                    companies={companies.map((c) => ({ id: c.id, name: c.name }))}
                  />
                )}
              </section>
            )}

            {/* Lista */}
            <section className="lg:col-span-3">
              {contacts.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {query
                      ? "Nenhum contato encontrado para essa busca."
                      : "Nenhum contato cadastrado ainda.\nUse o formulário ao lado para adicionar o primeiro."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {contacts.map((c) => {
                    const isEditing = editing?.id === c.id;
                    return (
                      <li
                        key={c.id}
                        className={`rounded-2xl border p-5 dark:border-zinc-800 ${
                          isEditing ? "border-zinc-400 dark:border-zinc-600" : "border-zinc-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
                              {c.name}
                            </h4>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                              {[c.phone, c.email, c.crmCompany?.name, c.origin]
                                .filter(Boolean)
                                .join(" · ") || "Sem dados adicionais"}
                            </p>
                            {c.tags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {c.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {canUpdate && (
                              <Link
                                href={`/contacts?edit=${c.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                                className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              >
                                Editar
                              </Link>
                            )}
                            {canDelete && (
                              <DeleteContactButton contactId={c.id} name={c.name} />
                            )}
                          </div>
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