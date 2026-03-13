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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
      <div className="mx-auto max-w-[1680px] px-4 py-5 lg:px-5">
        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
          <div className="xl:sticky xl:top-6">
          <AdminSidebar />
          </div>
          <div className="space-y-5">
            <AdminTopbar displayName={displayName} credits={credits} avatarUrl={avatarUrl} />
            <div className="rounded-[34px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
