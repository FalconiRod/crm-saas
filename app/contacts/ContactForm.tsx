"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createContact, updateContact } from "@/crm/contacts/actions";

export type ContactInput = {
  id?: string;
  name: string;
  crmCompanyId?: string | null;
  phone?: string | null;
  email?: string | null;
  tags?: string[];
  origin?: string | null;
};

type Props = {
  mode: "create" | "edit";
  contact?: ContactInput;
  companies: { id: string; name: string }[];
};

export default function ContactForm({ mode, contact, companies }: Props) {
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
          await updateContact(formData);
        } else {
          await createContact(formData);
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
      {isEdit && contact?.id && <input type="hidden" name="id" value={contact.id} />}
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nome do contato *
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={contact?.name}
          placeholder="Ex.: Maria Silva"
          className={inputCls}
          disabled={pending}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Telefone (opcional)
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={contact?.phone ?? ""}
            placeholder="(11) 99999-9999"
            className={inputCls}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            E-mail (opcional)
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={contact?.email ?? ""}
            placeholder="maria@empresa.com"
            className={inputCls}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor="companyId" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Empresa (opcional)
          </label>
          <select
            id="companyId"
            name="companyId"
            defaultValue={contact?.crmCompanyId ?? ""}
            className={inputCls}
            disabled={pending}
          >
            <option value="">— Sem empresa —</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="origin" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Origem (opcional)
          </label>
          <input
            id="origin"
            name="origin"
            defaultValue={contact?.origin ?? ""}
            placeholder="Ex.: Instagram, indicação..."
            className={inputCls}
            disabled={pending}
          />
        </div>
      </div>
      <div>
        <label htmlFor="tags" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tags (opcional, separadas por vírgula)
        </label>
        <input
          id="tags"
          name="tags"
          defaultValue={contact?.tags?.join(", ") ?? ""}
          placeholder="hot, cliente novo"
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
        {pending ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar contato"}
      </button>
    </form>
  );
}