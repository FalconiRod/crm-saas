"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateLeadStage, deleteLead } from "@/crm/leads/actions";
import { PIPELINE_STAGES, type PipelineStage } from "@shared/index";

type Props = {
  leadId: string;
  stage: PipelineStage;
  contactName: string;
  editHref: string;
};

export default function LeadCardControls({ leadId, stage, contactName, editHref }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function move(next: string) {
    if (!next || next === stage) return;
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("id", leadId);
        formData.set("stage", next);
        await updateLeadStage(formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocorreu um erro ao mover.");
      }
    });
  }

  function remove() {
    if (!window.confirm(`Excluir o lead de "${contactName}"? Essa ação não pode ser desfeita.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("id", leadId);
        await deleteLead(formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocorreu um erro ao excluir.");
      }
    });
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <select
        value={stage}
        onChange={(e) => move(e.target.value)}
        disabled={pending}
        className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      >
        {PIPELINE_STAGES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Link
        href={editHref}
        className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Editar
      </Link>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        Excluir
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}