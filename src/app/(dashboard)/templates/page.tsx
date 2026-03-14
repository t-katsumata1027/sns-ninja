import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { promptTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const templates = await db
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.tenantId, user.id))
    .orderBy(promptTemplates.createdAt);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">🤖 AI テンプレート</h2>
        <p className="text-neutral-400 mt-1 text-sm">
          Gemini AIが投稿生成に使うプロンプトテンプレートを管理します
        </p>
      </div>

      {/* Create Template Form */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
        <h3 className="text-base font-semibold mb-4">新しいテンプレートを作成</h3>
        <form className="space-y-4" action="/api/templates" method="POST">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">テンプレート名</label>
              <input
                name="name"
                type="text"
                placeholder="例: アフィリエイト商品紹介"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1.5">プラットフォーム</label>
              <select
                name="platform"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="x">X (Twitter)</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1.5">プロンプト内容</label>
            <textarea
              name="template"
              rows={4}
              placeholder="例: 「{product}」の魅力を伝える投稿を書いてください。ターゲットはダイエットに興味のある20-40代女性です。"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors active:scale-[0.98]"
          >
            テンプレートを作成
          </button>
        </form>
      </div>

      {/* Templates List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <h3 className="text-base font-semibold mb-4">テンプレート一覧</h3>
        {templates.length === 0 ? (
          <p className="text-neutral-500 text-sm">まだテンプレートがありません。上から作成してください。</p>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 p-4 bg-neutral-800/50 border border-neutral-700/50 rounded-xl"
              >
                <span
                  className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${
                    t.platform === "x"
                      ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                      : "bg-pink-500/10 text-pink-400 border-pink-500/30"
                  }`}
                >
                  {t.platform === "x" ? "𝕏" : "📷"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{t.name}</p>
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{t.template}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
