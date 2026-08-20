"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "@/crm/tasks/actions";

type Props = {
  contacts: { id: string; name: string }[];
  leads: { id: string; name: string }[];
  members: { id: string; name: string }[];
};

export default function TaskForm({ contacts, leads, members }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createTask(formData);
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
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Título *
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="Ex.: Ligar para Maria para alinhar proposta"
          className={inputCls}
          disabled={pending}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dueAt" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Vencimento (opcional)
          </label>
          <input id="dueAt" name="dueAt" type="datetime-local" className={inputCls} disabled={pending} />
        </div>
        <div>
          <label htmlFor="assigneeId" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Responsável (opcional)
          </label>
          <select id="assigneeId" name="assigneeId" defaultValue="" className={inputCls} disabled={pending}>
            <option value="">— Eu mesmo(a) —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="contactId" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Contato (opcional)
          </label>
          <select id="contactId" name="contactId" defaultValue="" className={inputCls} disabled={pending}>
            <option value="">— Nenhum —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="leadId" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Lead (opcional)
          </label>
          <select id="leadId" name="leadId" defaultValue="" className={inputCls} disabled={pending}>
            <option value="">— Nenhum —</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
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
          placeholder="Ex.: Combinar valores e prazo de entrega."
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
        {pending ? "Salvando..." : "Criar tarefa"}
      </button>
    </form>
  );
}