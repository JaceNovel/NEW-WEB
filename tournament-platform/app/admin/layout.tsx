import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import AdminTopbar from "@/components/admin/AdminTopbar";
import AdminSidebar from "@/components/AdminSidebar";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const displayName = session.user.name?.trim() || "Administrateur";
  const avatarUrl = session.user.logoUrl?.trim() || "/pp1-removebg-preview (1).png";
  const credits = session.user.credits ?? 0;

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 lg:px-5">
      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
        <div className="xl:sticky xl:top-24">
          <AdminSidebar />
        </div>
        <div className="space-y-5">
          <AdminTopbar displayName={displayName} credits={credits} avatarUrl={avatarUrl} />
          <div className="relative overflow-hidden rounded-[34px] border border-fuchsia-300/12 bg-[linear-gradient(180deg,rgba(25,11,47,0.76),rgba(7,8,20,0.84))] p-4 shadow-[0_0_60px_rgba(151,74,255,0.10)] backdrop-blur-xl sm:p-5 lg:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,157,79,0.12),transparent_24%),radial-gradient(circle_at_70%_10%,rgba(170,84,255,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_20%)]" />
            <div className="relative">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
