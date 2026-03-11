"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  buyerPseudo: string;
};

export default function AllianceRequestCard({ buyerPseudo }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"ACCEPT" | "REFUSE" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "ACCEPT" | "REFUSE") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch("/api/player/alliance/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 rounded-[18px] border border-amber-300/20 bg-amber-300/10 px-4 py-4 text-sm text-amber-50">
      <div className="font-black uppercase tracking-[0.16em]">Demande d'association</div>
      <div className="mt-2 text-white/80">
        <span className="font-bold text-white">{buyerPseudo}</span> veut t'associer à sa position. Tu peux accepter ou refuser.
      </div>

      {error ? <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">{error}</div> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          disabled={busy !== null}
          onClick={() => void respond("ACCEPT")}
          className="tp-button-ghost disabled:opacity-60"
        >
          {busy === "ACCEPT" ? "Acceptation..." : "Accepter"}
        </button>
        <button
          disabled={busy !== null}
          onClick={() => void respond("REFUSE")}
          className="tp-button-ghost disabled:opacity-60"
        >
          {busy === "REFUSE" ? "Refus..." : "Refuser"}
        </button>
      </div>
    </div>
  );
}
