import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/clerk";
import SetupRequired from "@/components/SetupRequired";

export default async function DashboardPage() {
  if (!clerkEnabled) return <SetupRequired />;

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            CRM SaaS
          </span>
        </div>
        <UserButton />
      </header>

      <main className="flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Olá, {user?.firstName ?? user?.username ?? "usuário"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Sua conta está sincronizada com o Clerk. As funcionalidades do CRM
          chegam nas próximas fases.
        </p>

        <div className="mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { t: "Empresas", d: "Cadastro de empresas-clientes" },
            { t: "Contatos", d: "Agenda por empresa" },
            { t: "Leads", d: "Funil de vendas" },
          ].map((f) => (
            <div
              key={f.t}
              className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
                {f.t}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {f.d}
              </p>
              <span className="mt-3 inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Em breve
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}