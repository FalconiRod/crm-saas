"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCompany, updateCompany } from "@/crm/companies/actions";

export type CompanyInput = {
  id?: string;
  name: string;
  cnpj?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
};

type Props = {
  mode: "create" | "edit";
  company?: CompanyInput;
  onDone?: () => void;
};

export default function CompanyForm({ mode, company, onDone }: Props) {
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
          await updateCompany(formData);
        } else {
          await createCompany(formData);
        }
        formRef.current?.reset();
        router.refresh();
        onDone?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocorreu um erro. Tente de novo.");
      }
    });
  }

  const inputCls =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {isEdit && company?.id && <input type="hidden" name="id" value={company.id} />}
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nome da empresa *
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={company?.name}
          placeholder="Ex.: Padaria do João"
          className={inputCls}
          disabled={pending}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cnpj" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            CNPJ (opcional)
          </label>
          <input
            id="cnpj"
            name="cnpj"
            defaultValue={company?.cnpj ?? ""}
            placeholder="00.000.000/0000-00"
            className={inputCls}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor="city" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Cidade (opcional)
          </label>
          <input
            id="city"
            name="city"
            defaultValue={company?.city ?? ""}
            placeholder="Ex.: São Paulo - SP"
            className={inputCls}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Telefone (opcional)
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={company?.phone ?? ""}
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
            defaultValue={company?.email ?? ""}
            placeholder="contato@empresa.com"
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
          defaultValue={company?.notes ?? ""}
          placeholder="Anotações sobre a empresa"
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
        {pending ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar empresa"}
      </button>
    </form>
  );
}