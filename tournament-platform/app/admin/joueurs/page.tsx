import AdminPlayersManager from "@/components/admin/AdminPlayersManager";

export default function AdminJoueursPage() {
  return (
    <main className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#fff7f2_100%)] px-6 py-6">
        <div className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-slate-400">Section admin</div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Gestion des joueurs</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Tous les joueurs inscrits, leurs statistiques, leurs crédits et les actions de modération ou de suppression.</p>
      </div>

      <AdminPlayersManager />
    </main>
  );
}
