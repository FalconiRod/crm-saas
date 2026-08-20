"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleTask, deleteTask } from "@/crm/tasks/actions";

type Props = {
  taskId: string;
  title: string;
  done: boolean;
  canDelete: boolean;
};

export default function TaskActions({ taskId, title, done, canDelete }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("id", taskId);
        await toggleTask(formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocorreu um erro.");
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`Excluir a tarefa "${title}"? Essa ação não pode ser desfeita.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("id", taskId);
        await deleteTask(formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocorreu um erro ao excluir.");
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        aria-label={done ? "Reabrir tarefa" : "Concluir tarefa"}
        title={done ? "Reabrir" : "Concluir"}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition disabled:opacity-60 ${
          done
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
            : "border-zinc-300 text-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800"
        }`}
      >
        {done ? "↩" : "✓"}
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          {pending ? "..." : "Excluir"}
        </button>
      )}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}