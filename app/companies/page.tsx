import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionWorkspace } from "@/lib/session";
import { withTenant } from "@/core/tenancy/tenancy";
import { can } from "@/core/permissions/access";
import type { Role } from "@shared/index";
import CompanyForm from "./CompanyForm";
import DeleteCompanyButton from "./DeleteCompany";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { active } = await getSessionWorkspace();
  if (!active) redirect("/dashboard");

  const [{ edit }, companies] = await Promise.all([
    searchParams,
    withTenant(active.tenantId, (tx) =>
      tx.crmCompany.findMany({ orderBy: { createdAt: "desc" } })
    ),
  ]);

  const maxCompanies = active.tenant.plan.maxCompaniesPerAccount;
  const role = active.role as Role;
  const canCreate = can(role, "company.create");
  const canUpdate = can(role, "company.update");
  const canDelete = can(role, "company.delete");
  const editing = companies.find((c) => c.id === edit) ?? null;

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
          <h1 className="font-semibold text-zinc-900 dark:text-zinc-50">Empresas</h1>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {active.tenant.name}
        </span>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                Empresas-clientes
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {maxCompanies === null
                  ? "Sem limite de empresas no seu plano."
                  : `${companies.length} de ${maxCompanies} empresa(s) usada(s) no seu plano.`}
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Cadastro / edição */}
            {canCreate && (
              <section className="rounded-2xl border border-zinc-200 p-6 lg:col-span-2 dark:border-zinc-800">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {editing ? "Editar empresa" : "Nova empresa"}
                </h3>
                <p className="mb-4 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {editing
                    ? `Alterando "${editing.name}".`
                    : "Preencha os dados e clique em cadastrar."}
                </p>
                {editing && canUpdate ? (
                  <>
                    <CompanyForm mode="edit" company={editing} />
                    <Link
                      href="/companies"
                      className="mt-3 inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      Cancelar edição
                    </Link>
                  </>
                ) : (
                  <CompanyForm mode="create" />
                )}
              </section>
            )}

            {/* Lista */}
            <section className="lg:col-span-3">
              {companies.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Nenhuma empresa cadastrada ainda.
                    <br />
                    Use o formulário ao lado para adicionar a primeira.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {companies.map((c) => {
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
                              {[c.cnpj, c.city, c.phone, c.email]
                                .filter(Boolean)
                                .join(" · ") || "Sem dados adicionais"}
                            </p>
                            {c.notes && (
                              <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
                                {c.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {canUpdate && (
                              <Link
                                href={`/companies?edit=${c.id}`}
                                className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              >
                                Editar
                              </Link>
                            )}
                            {canDelete && (
                              <DeleteCompanyButton companyId={c.id} name={c.name} />
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