"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeInvitation } from "./actions";

export default function RevokeInvitation({ invitationId, email }: { invitationId: string; email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function revoke() {
    if (!window.confirm(`Revogar o convite de ${email}?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("invitationId", invitationId);
        await revokeInvitation(formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocorreu um erro.");
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={revoke}
        disabled={pending}
        className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        {pending ? "Revogando..." : "Revogar"}
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}