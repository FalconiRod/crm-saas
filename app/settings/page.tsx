import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionWorkspace } from "@/lib/session";
import { renameWorkspace } from "./actions";
import DeleteWorkspace from "./DeleteWorkspace";

export default async function SettingsPage() {
  const { active } = await getSessionWorkspace();
  if (!active) redirect("/dashboard");
  const isOwner = active.role === "OWNER";

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
          <h1 className="font-semibold text-zinc-900 dark:text-zinc-50">Configurações</h1>
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {active.tenant.name}
        </span>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-2xl space-y-8">
          <section className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Nome do workspace</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Como o workspace aparece no painel e no seletor.
            </p>
            {isOwner ? (
              <form action={renameWorkspace} className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  name="name"
                  required
                  defaultValue={active.tenant.name}
                  className="w-full flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
                >
                  Salvar
                </button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                Somente o dono pode renomear o workspace.
              </p>
            )}
          </section>

          {isOwner && (
            <section>
              <DeleteWorkspace workspaceName={active.tenant.name} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}