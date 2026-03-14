import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-neutral-900 border-r border-neutral-800 p-4 gap-1 shrink-0">
        <div className="mb-6 px-2">
          <h1 className="text-lg font-bold tracking-tight">⚡ SNS Ninja</h1>
          <p className="text-xs text-neutral-500 mt-0.5 truncate">{user.email}</p>
        </div>
        <NavLink href="/">🏠 Dashboard</NavLink>
        <NavLink href="/accounts">📱 Accounts</NavLink>
        <NavLink href="/posts">📝 Posts</NavLink>
        <NavLink href="/templates">🤖 AI Templates</NavLink>
        <NavLink href="/schedule">📅 Schedule</NavLink>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}
