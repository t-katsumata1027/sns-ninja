import { db } from "@/db";
import { accounts, posts } from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// Simple sparkline data for demo (revenue trend - would come from real analytics)
const REVENUE_DATA = [320, 480, 410, 680, 590, 820, 940, 1050, 980, 1200, 1380, 1500];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch stats in parallel
  const [accountRows, statusCounts] = await Promise.all([
    db.select({ id: accounts.id, platform: accounts.platform, username: accounts.username, isActive: accounts.isActive })
      .from(accounts)
      .where(eq(accounts.tenantId, user.id))
      .limit(5),
    db.select({ status: posts.status, count: count() })
      .from(posts)
      .where(eq(posts.tenantId, user.id))
      .groupBy(posts.status),
  ]);

  const totalPosts = statusCounts.reduce((s, r) => s + Number(r.count), 0);
  const pendingCount = statusCounts.find((r) => r.status === "pending_approval")?.count ?? 0;
  const publishedCount = statusCounts.find((r) => r.status === "published")?.count ?? 0;
  const activeAccounts = accountRows.filter((a) => a.isActive).length;

  const maxRevenue = Math.max(...REVENUE_DATA);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold">🏠 Dashboard</h2>
        <p className="text-neutral-400 mt-1 text-sm">SNS Ninja 収益・パフォーマンス概要</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="接続アカウント" value={accountRows.length} icon="📱" accent="blue" />
        <StatCard label="アクティブ" value={activeAccounts} icon="✅" accent="green" />
        <StatCard label="承認待ち投稿" value={Number(pendingCount)} icon="⏳" accent="amber" />
        <StatCard label="投稿済み" value={Number(publishedCount)} icon="🚀" accent="purple" />
      </div>

      {/* Revenue Trend */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold">収益トレンド</h3>
            <p className="text-xs text-neutral-500 mt-0.5">過去12週間の推定収益 (USD)</p>
          </div>
          <span className="text-2xl font-bold text-green-400">$1,500</span>
        </div>
        {/* Sparkline Chart */}
        <div className="flex items-end gap-1.5 h-20">
          {REVENUE_DATA.map((val, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-600 to-blue-400 opacity-80 hover:opacity-100 transition-opacity"
              style={{ height: `${(val / maxRevenue) * 100}%` }}
              title={`Week ${i + 1}: $${val}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-neutral-600 mt-2">
          <span>12週前</span><span>今週</span>
        </div>
      </div>

      {/* Account Health */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <h3 className="text-base font-semibold mb-4">アカウント健全性</h3>
        {accountRows.length === 0 ? (
          <p className="text-neutral-500 text-sm">アカウントが未登録です。<a href="/accounts" className="text-blue-400 hover:underline">アカウントを追加</a></p>
        ) : (
          <div className="space-y-3">
            {accountRows.map((acc) => (
              <div key={acc.id} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${acc.isActive ? "bg-green-400" : "bg-red-400"}`} />
                <span className="text-sm font-medium">{acc.username}</span>
                <span className="text-xs text-neutral-500 capitalize">{acc.platform}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${acc.isActive ? "text-green-400 border-green-500/30 bg-green-500/10" : "text-red-400 border-red-500/30 bg-red-500/10"}`}>
                  {acc.isActive ? "正常" : "無効"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {Number(pendingCount) > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-400">⏳ {pendingCount}件の投稿が承認待ちです</p>
            <p className="text-xs text-neutral-500 mt-0.5">HITLダッシュボードで確認・承認してください</p>
          </div>
          <a
            href="/posts"
            className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            確認する →
          </a>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, icon, accent,
}: {
  label: string; value: number; icon: string; accent: "blue" | "green" | "amber" | "purple";
}) {
  const colors: Record<string, string> = {
    blue: "border-blue-500/20 bg-blue-500/5",
    green: "border-green-500/20 bg-green-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    purple: "border-purple-500/20 bg-purple-500/5",
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[accent]}`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-neutral-500 mt-0.5">{label}</div>
    </div>
  );
}
