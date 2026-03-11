import AdminPlayersManager from "@/components/admin/AdminPlayersManager";

export default function AdminJoueursPage() {
  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white">Joueurs</h1>
        <p className="mt-2 text-sm text-white/60">Tous les joueurs inscrits, leurs stats et leur gestion</p>
      </div>

      <AdminPlayersManager />
    </main>
  );
}
