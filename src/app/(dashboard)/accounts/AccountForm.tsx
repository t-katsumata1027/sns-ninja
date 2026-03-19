"use client";

import { useState } from "react";
import { addAccount } from "./actions";

export function AccountForm({ concepts }: { concepts: { id: string; name: string; genre: string }[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New state variables for UX improvements
  const [accountType, setAccountType] = useState<"affiliate" | "growth">("affiliate");
  const [enableAutoPost, setEnableAutoPost] = useState(true);
  const [enableImageGeneration, setEnableImageGeneration] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await addAccount(formData);

    if (res.success) {
      window.location.reload(); // Simple refresh to show updated list
    } else {
      setError(res.error || "Failed to add account");
    }
    setLoading(false);
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 mb-8">
      <h3 className="text-base font-semibold mb-4">新規アカウント連携</h3>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-6">
          <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">運用目的</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`border rounded-xl p-4 cursor-pointer transition-all ${accountType === "affiliate" ? "border-blue-500 bg-blue-500/10" : "border-neutral-800 bg-neutral-950"}`}>
              <input type="radio" name="accountType" value="affiliate" checked={accountType === "affiliate"} onChange={() => setAccountType("affiliate")} className="hidden" />
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🎯</span>
                <span className="font-bold text-sm text-white">アフィリエイト運用</span>
              </div>
              <span className="block text-xs text-neutral-400 leading-relaxed">AIが選んだコンセプトに沿って自動投稿を行い、収益化を目指します。</span>
            </label>
            <label className={`border rounded-xl p-4 cursor-pointer transition-all ${accountType === "growth" ? "border-amber-500 bg-amber-500/10" : "border-neutral-800 bg-neutral-950"}`}>
              <input type="radio" name="accountType" value="growth" checked={accountType === "growth"} onChange={() => setAccountType("growth")} className="hidden" />
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">📈</span>
                <span className="font-bold text-sm text-white">既存アカウント育成</span>
              </div>
              <span className="block text-xs text-neutral-400 leading-relaxed">エンゲージメント中心でフォロワーを増やします。自動投稿は任意です。</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              SNSプラットフォーム
            </label>
            <select
              name="platform"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
            >
              <option value="x">X (Twitter)</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              ユーザーネーム
            </label>
            <input
              name="username"
              type="text"
              required
              placeholder="@handle"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-neutral-600"
            />
          </div>
        </div>

        <div className="space-y-4 mb-6 pt-4 border-t border-neutral-800">
          <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl p-4">
            <div>
              <span className="block font-semibold text-sm text-white">📝 AI自動投稿</span>
              <span className="block text-xs text-neutral-500">コンセプトに沿った内容を自動で生成・予約投稿します</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" name="enableAutoPost" value="true" className="sr-only peer" checked={enableAutoPost} onChange={(e) => setEnableAutoPost(e.target.checked)} />
              <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {enableAutoPost && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 mb-4">
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                AIコンセプト（{accountType === "affiliate" ? "必須" : "任意"}）
              </label>
              <select
                name="conceptId"
                required={accountType === "affiliate" && enableAutoPost}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
              >
                <option value="">-- コンセプトを選択 --</option>
                {concepts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.genre})</option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-2">
                市場調査で作成したコンセプトを紐付けると、AIが自動で投稿プランを最適化します。
              </p>
            </div>
          )}

          {enableAutoPost && (
            <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <div>
                <span className="block font-semibold text-sm text-white">🖼️ AI画像生成</span>
                <span className="block text-xs text-neutral-500">投稿に合わせて関連する画像を自動生成して添付します</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="enableImageGeneration" value="true" className="sr-only peer" checked={enableImageGeneration} onChange={(e) => setEnableImageGeneration(e.target.checked)} />
                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          )}
        </div>

        <div>
           <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
             APIトークン（任意）
           </label>
           <input
             name="token"
             type="password"
             placeholder="アクセストークン（暗号化されて保存されます）"
             className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-neutral-600"
           />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? "連携中..." : "アカウントを連携する"}
        </button>
      </form>
    </div>
  );
}
