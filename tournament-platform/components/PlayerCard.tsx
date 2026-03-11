import Image from "next/image";
import CreditBadge from "@/components/CreditBadge";

export default function PlayerCard({
  pseudo,
  freefireId,
  logoUrl,
  credits,
  wins,
  losses,
}: {
  pseudo: string;
  freefireId: string;
  logoUrl: string;
  credits: number;
  wins: number;
  losses: number;
}) {
  return (
    <div className="tp-glass rounded-3xl p-6">
      <div className="flex items-center gap-4">
        <Image src={logoUrl} alt={pseudo} width={56} height={56} className="h-14 w-14 rounded-2xl object-cover" />
        <div className="min-w-0">
          <div className="truncate text-lg font-bold text-white">{pseudo}</div>
          <div className="text-sm text-white/60">ID Free Fire: {freefireId}</div>
        </div>
        <div className="ml-auto">
          <CreditBadge credits={credits} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/60">Gagnés</div>
          <div className="text-lg font-bold text-white">{wins}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/60">Perdus</div>
          <div className="text-lg font-bold text-white">{losses}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/60">Ratio</div>
          <div className="text-lg font-bold text-white">{wins + losses ? (wins / (wins + losses)).toFixed(2) : "0.00"}</div>
        </div>
      </div>
    </div>
  );
}
