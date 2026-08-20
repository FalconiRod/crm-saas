"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeMemberRole, removeMember } from "./actions";
import type { Role } from "@shared/index";

type Props = {
  userId: string;
  memberName: string;
  currentRole: Role;
  roles: Role[];
  roleLabels: Record<Role, string>;
};

export default function MemberActions({ userId, memberName, currentRole, roles, roleLabels }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(next: string) {
    if (!next || next === currentRole) return;
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("userId", userId);
        formData.set("role", next);
        await changeMemberRole(formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocorreu um erro.");
      }
    });
  }

  function remove() {
    if (!window.confirm(`Remover ${memberName} do workspace?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("userId", userId);
        await removeMember(formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocorreu um erro.");
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <select
        value={currentRole}
        onChange={(e) => change(e.target.value)}
        disabled={pending}
        className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {roleLabels[r]}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        Remover
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}