import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col w-60 bg-neutral-900 border-r border-neutral-800 p-4 gap-1 shrink-0">
        <div className="mb-6 px-2">
          <h1 className="text-lg font-bold tracking-tight">⚡ SNS Ninja</h1>
          <p className="text-xs text-neutral-500 mt-0.5 truncate">{user.email}</p>
        </div>
        <NavLink href="/" icon="🏠">Dashboard</NavLink>
        <NavLink href="/accounts" icon="📱">Accounts</NavLink>
        <NavLink href="/posts" icon="📝">Posts</NavLink>
        <NavLink href="/templates" icon="🤖">AI Templates</NavLink>
        <NavLink href="/research" icon="🔍">Market Research</NavLink>
        <NavLink href="/settings/product-growth" icon="⚙️">Product Growth</NavLink>
        
        <div className="mt-auto pt-4 border-t border-neutral-800">
          <LogoutButton isSidebar />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto">{children}</main>

      {/* Bottom Navigation (mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-sm border-t border-neutral-800 flex items-center z-50">
        <MobileNavLink href="/" icon="🏠" label="ホーム" />
        <MobileNavLink href="/research" icon="🔍" label="リサーチ" />
        <MobileNavLink href="/accounts" icon="📱" label="連携" />
        <LogoutButton />
      </nav>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
    >
      <span>{icon}</span>
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 text-neutral-400 hover:text-white active:text-white transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
