"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteMember } from "./actions";
import { INVITABLE_ROLES } from "@/core/permissions/access";
import type { Role } from "@shared/index";

const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Dono",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  USER: "Membro",
  VIEWER: "Somente leitura",
};

export default function InviteForm({ maxReached }: { maxReached: boolean }) {
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
        await inviteMember(formData);
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            E-mail do convidado *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="pessoa@empresa.com"
            className={inputCls}
            disabled={pending || maxReached}
          />
        </div>
        <div>
          <label htmlFor="role" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Papel
          </label>
          <select
            id="role"
            name="role"
            defaultValue="VIEWER"
            className={inputCls}
            disabled={pending || maxReached}
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {maxReached && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          Limite de membros atingido no seu plano. Assine um plano maior ou revogue convites pendentes.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || maxReached}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
      >
        {pending ? "Convidando..." : "Enviar convite"}
      </button>
    </form>
  );
}