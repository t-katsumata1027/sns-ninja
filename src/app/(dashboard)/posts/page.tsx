import { db } from "@/db";
import { posts, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { PostItem } from "./PostItem";

const STATUS_STYLES: Record<string, string> = {
  pending_approval: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  approved: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  scheduled: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  published: "bg-green-500/10 text-green-400 border-green-500/30",
  rejected: "bg-red-500/10 text-red-400 border-red-500/30",
  failed: "bg-red-500/10 text-red-400 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  pending_approval: "⏳ 承認待ち",
  approved: "✅ 承認済み",
  scheduled: "📅 スケジュール済み",
  published: "🚀 投稿済み",
  rejected: "❌ 却下",
  failed: "⚠️ 失敗",
};

export default async function PostsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const allPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      status: posts.status,
      scheduledFor: posts.scheduledFor,
      publishedAt: posts.publishedAt,
      createdAt: posts.createdAt,
      accountId: posts.accountId,
    })
    .from(posts)
    .where(eq(posts.tenantId, user.id))
    .orderBy(posts.createdAt);

  const pendingPosts = allPosts.filter((p) => p.status === "pending_approval");
  const otherPosts = allPosts.filter((p) => p.status !== "pending_approval");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">📝 Posts</h2>
        <p className="text-neutral-400 mt-1 text-sm">
          AIが生成した投稿を確認・承認してください（HITL）
        </p>
      </div>

      {/* Pending Approval Section */}
      {pendingPosts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-widest mb-3">
            ⏳ 承認待ち ({pendingPosts.length})
          </h3>
          <div className="space-y-3">
            {pendingPosts.map((post) => (
              <PostItem key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}

      {/* Other Posts */}
      {otherPosts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-3">
            履歴
          </h3>
          <div className="space-y-2">
            {otherPosts.map((post) => (
              <div
                key={post.id}
                className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 flex items-start gap-3"
              >
                <span
                  className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[post.status] ?? "bg-neutral-800 text-neutral-400 border-neutral-700"}`}
                >
                  {STATUS_LABELS[post.status] ?? post.status}
                </span>
                <p className="text-sm text-neutral-300 line-clamp-2 leading-relaxed">
                  {post.content}
                </p>
                <span className="text-xs text-neutral-600 ml-auto shrink-0">
                  {new Date(post.createdAt).toLocaleDateString("ja-JP")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {allPosts.length === 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
          <p className="text-neutral-500 text-sm">まだ投稿がありません。AIコンテンツ生成APIを使って投稿を作成してください。</p>
        </div>
      )}
    </div>
  );
}
