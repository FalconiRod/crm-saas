"use client";

import { useTransition, useState } from "react";
import { deleteWorkspace } from "./actions";

export default function DeleteWorkspace({ workspaceName }: { workspaceName: string }) {
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  const ready = confirm === workspaceName;

  return (
    <div className="rounded-2xl border border-red-200 p-6 dark:border-red-900/50">
      <h3 className="font-semibold text-red-700 dark:text-red-400">
        Excluir workspace permanentemente
      </h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Todos os dados (empresas, contatos, leads, membros e eventos) serão apagados. Essa
        ação não pode ser desfeita.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={`Digite "${workspaceName}" para confirmar`}
          className="w-full flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-red-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="button"
          disabled={!ready || pending}
          onClick={() => startTransition(() => deleteWorkspace())}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Excluindo..." : "Excluir workspace"}
        </button>
      </div>
    </div>
  );
}