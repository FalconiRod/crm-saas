import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { clerkEnabled } from "@/lib/clerk";
import SetupRequired from "@/components/SetupRequired";

export default async function Home() {
  if (!clerkEnabled) {
    return <SetupRequired />;
  }

  const { userId } = await auth();

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          CRM SaaS
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          Seu CRM multi-tenant — empresas, contatos, leads e pipeline em um só
          lugar, com login seguro.
        </p>
        {userId ? (
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
            >
              Ir para o painel
            </Link>
          </div>
        ) : (
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/sign-up"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
            >
              Criar conta
            </Link>
            <Link
              href="/sign-in"
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Entrar
            </Link>
          </div>
        )}
        <footer className="mt-12 flex items-center justify-center gap-4 text-sm text-zinc-400 dark:text-zinc-500">
          <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Política de Privacidade
          </Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Termos de Uso
          </Link>
        </footer>
      </div>
    </main>
  );
}