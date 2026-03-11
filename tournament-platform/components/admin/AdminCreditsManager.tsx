"use client";

import { useEffect, useMemo, useState } from "react";

type AllianceRow = {
  id: string;
  pseudo: string;
  freefireId: string;
  credits: number;
  recruitedPlayers: Array<{ id: string; pseudo: string; freefireId: string }>;
};

type ProductRow = {
  id: string;
  key: string;
  label: string;
  credits: number;
  priceFcfa: number;
  maxPurchasesPerPlayer: number | null;
  description: string;
  isActive: boolean;
};

export default function AdminCreditsManager({
  initialAlliances,
}: {
  initialAlliances: AllianceRow[];
}) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    key: "",
    label: "",
    credits: "",
    priceFcfa: "",
    maxPurchasesPerPlayer: "",
    description: "",
  });

  async function loadProducts() {
    setError(null);
    const res = await fetch("/api/admin/credit-product");
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error ?? "Erreur");
      return;
    }
    setProducts(json.products);
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  const alliances = useMemo(() => initialAlliances.filter((player) => player.recruitedPlayers.length > 0), [initialAlliances]);

  async function createProduct() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/credit-product", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: form.key,
          label: form.label,
          credits: Number(form.credits),
          priceFcfa: Number(form.priceFcfa),
          maxPurchasesPerPlayer: form.maxPurchasesPerPlayer ? Number(form.maxPurchasesPerPlayer) : null,
          description: form.description,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      setForm({ key: "", label: "", credits: "", priceFcfa: "", maxPurchasesPerPlayer: "", description: "" });
      await loadProducts();
    } catch (creationError) {
      setError(creationError instanceof Error ? creationError.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-fuchsia-300/16 bg-[linear-gradient(180deg,rgba(27,11,47,0.82),rgba(8,8,20,0.82))] p-5">
        <div>
          <h1 className="text-2xl font-black text-white">Gestion crédits</h1>
          <p className="mt-2 text-sm text-white/55">Suivi des associations actives et gestion des produits crédits affichés dans la boutique publique.</p>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border border-cyan-300/16 bg-black/20 p-5">
          <div className="text-lg font-black text-white">Associations actives</div>
          <div className="mt-1 text-sm text-white/55">Tous les joueurs qui ont consolidé leur position avec un renfort.</div>

          <div className="mt-5 space-y-3">
            {alliances.length ? alliances.map((player) => (
              <div key={player.id} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-black text-white">{player.pseudo} X {player.recruitedPlayers[0]?.pseudo}</div>
                    <div className="mt-1 text-sm text-white/55">{player.freefireId} • {player.credits} crédits</div>
                  </div>
                  <div className="text-right text-sm text-white/60">
                    <div>Renfort</div>
                    <div className="font-bold text-white">{player.recruitedPlayers[0]?.freefireId}</div>
                  </div>
                </div>
              </div>
            )) : <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/50">Aucune association active pour le moment.</div>}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[28px] border border-amber-300/16 bg-black/20 p-5">
            <div className="text-lg font-black text-white">Ajouter un produit crédit</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input value={form.key} onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value }))} placeholder="Clé produit" className="tp-input" />
              <input value={form.label} onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))} placeholder="Nom affiché" className="tp-input" />
              <input value={form.credits} onChange={(e) => setForm((prev) => ({ ...prev, credits: e.target.value }))} placeholder="Nombre de crédits" className="tp-input" />
              <input value={form.priceFcfa} onChange={(e) => setForm((prev) => ({ ...prev, priceFcfa: e.target.value }))} placeholder="Prix FCFA" className="tp-input" />
              <input value={form.maxPurchasesPerPlayer} onChange={(e) => setForm((prev) => ({ ...prev, maxPurchasesPerPlayer: e.target.value }))} placeholder="Limite par joueur (optionnel)" className="tp-input sm:col-span-2" />
              <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description produit" className="tp-input min-h-[120px] sm:col-span-2" />
            </div>
            <button type="button" disabled={busy} onClick={() => void createProduct()} className="tp-button-ghost mt-4 disabled:opacity-60">
              {busy ? "Création..." : "Ajouter le produit"}
            </button>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <div className="text-lg font-black text-white">Produits disponibles</div>
            <div className="mt-4 space-y-3">
              {products.map((product) => (
                <div key={product.id} className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-black text-white">{product.label}</div>
                      <div className="mt-1 text-sm text-white/55">{product.description}</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">{product.isActive ? "Actif" : "Inactif"}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/68">
                    <span>{product.credits} crédits</span>
                    <span>{new Intl.NumberFormat("fr-FR").format(product.priceFcfa)} FCFA</span>
                    <span>{product.maxPurchasesPerPlayer ? `Limite ${product.maxPurchasesPerPlayer}` : "Illimité"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}