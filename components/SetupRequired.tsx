import Link from "next/link";
import { clerkEnabled } from "@/lib/clerk";

// Tela mostrada enquanto as chaves do Clerk não forem configuradas no .env.
// (Fase 3 — Autenticação). Não usa ClerkProvider nem auth().
export default function SetupRequired() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Autenticação pendente (Clerk)
        </h1>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          <li>
            Crie uma aplicação grátis em{" "}
            <a
              href="https://dashboard.clerk.com"
              className="font-medium text-zinc-900 underline dark:text-zinc-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              dashboard.clerk.com
            </a>
          </li>
          <li>
            Copie as chaves <code>pk_test_...</code> (publicável) e{" "}
            <code>sk_test_...</code> (secreta) e cole no{" "}
            <code>.env</code>:
            <pre className="mt-1 overflow-x-auto rounded bg-zinc-100 p-2 text-xs dark:bg-zinc-900">
              {`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."`}
            </pre>
          </li>
          <li>
            Em <strong>Webhooks</strong> do Clerk, crie o endpoint{" "}
            <code>/api/webhooks/clerk</code> para o evento{" "}
            <code>user.created</code>, <code>user.updated</code> e{" "}
            <code>user.deleted</code>, e cole o <em>signing secret</em> em{" "}
            <code>CLERK_WEBHOOK_SIGNING_SECRET</code>.
          </li>
          <li>Reinicie o servidor (<code>npm run dev</code>).</li>
        </ol>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-200"
        >
          Voltar para o início
        </Link>
      </div>
    </main>
  );
}