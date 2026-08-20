"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLead, updateLead } from "@/crm/leads/actions";
import { PIPELINE_STAGES, type PipelineStage } from "@shared/index";

export type LeadInput = {
  id?: string;
  contactId: string;
  stage: PipelineStage;
  value?: string | null;
  probability?: number | null;
  origin?: string | null;
  notes?: string | null;
};

type Props = {
  mode: "create" | "edit";
  lead?: LeadInput;
  contacts: { id: string; name: string }[];
};

export default function LeadForm({ mode, lead, contacts }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isEdit = mode === "edit";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (isEdit) {
          await updateLead(formData);
        } else {
          await createLead(formData);
        }
        formRef.current?.reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocorreu um erro. Tente de novo.");
      }
    });
  }

  const inputCls =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {isEdit && lead?.id && <input type="hidden" name="id" value={lead.id} />}
      <div>
        <label htmlFor="contactId" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contato *
        </label>
        <select
          id="contactId"
          name="contactId"
          required
          defaultValue={lead?.contactId ?? ""}
          className={inputCls}
          disabled={pending}
        >
          <option value="" disabled>
            Selecione um contato
          </option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="stage" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Estágio
          </label>
          <select
            id="stage"
            name="stage"
            defaultValue={lead?.stage ?? "NOVO"}
            className={inputCls}
            disabled={pending}
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="value" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Valor (R$, opcional)
          </label>
          <input
            id="value"
            name="value"
            defaultValue={lead?.value ?? ""}
            placeholder="Ex.: 1500,00"
            inputMode="decimal"
            className={inputCls}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor="probability" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Probabilidade % (opcional)
          </label>
          <input
            id="probability"
            name="probability"
            type="number"
            min={0}
            max={100}
            defaultValue={lead?.probability ?? ""}
            placeholder="Ex.: 50"
            className={inputCls}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor="origin" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Origem (opcional)
          </label>
          <input
            id="origin"
            name="origin"
            defaultValue={lead?.origin ?? ""}
            placeholder="Ex.: Instagram, indicação..."
            className={inputCls}
            disabled={pending}
          />
        </div>
      </div>
      <div>
        <label htmlFor="notes" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Observações (opcional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={lead?.notes ?? ""}
          placeholder="Contexto da negociação"
          className={inputCls}
          disabled={pending}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
      >
        {pending ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar lead"}
      </button>
    </form>
  );
}