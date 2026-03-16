"use client";

import { useState } from "react";
import { addAccount } from "./actions";

export function AccountForm({ concepts }: { concepts: { id: string; name: string; genre: string }[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div>
          <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
            AIコンセプト（任意）
          </label>
          <select
            name="conceptId"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
          >
            <option value="">-- コンセプトを紐付けない --</option>
            {concepts.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.genre})</option>
            ))}
          </select>
          <p className="text-xs text-neutral-500 mt-1">
            市場調査で作成したコンセプトを紐付けると、AIが自動で投稿プランを最適化します。
          </p>
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
