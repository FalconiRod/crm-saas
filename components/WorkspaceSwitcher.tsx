"use client";

import { useTransition } from "react";
import { selectWorkspace } from "@/app/dashboard/actions";

type Props = {
  memberships: { tenantId: string; tenantName: string }[];
  activeTenantId: string;
};

export default function WorkspaceSwitcher({ memberships, activeTenantId }: Props) {
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    if (!value || value === activeTenantId) return;
    const formData = new FormData();
    formData.set("tenantId", value);
    startTransition(() => selectWorkspace(formData));
  }

  return (
    <select
      name="tenantId"
      defaultValue={activeTenantId}
      disabled={pending}
      onChange={(e) => handleChange(e.target.value)}
      className="max-w-[200px] truncate rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-zinc-900 outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
    >
      {memberships.map((m) => (
        <option key={m.tenantId} value={m.tenantId}>
          {m.tenantName}
        </option>
      ))}
    </select>
  );
}