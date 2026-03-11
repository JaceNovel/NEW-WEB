import { cn } from "@/lib/utils";

export default function CreditBadge({ credits, className }: { credits: number; className?: string }) {
  const tone = credits < 5 ? "bg-red-500/15 text-red-200 border-red-400/25" : "bg-emerald-500/15 text-emerald-200 border-emerald-400/25";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", tone, className)}>
      {credits} crédits
    </span>
  );
}
