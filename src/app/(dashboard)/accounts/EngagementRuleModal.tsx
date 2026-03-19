"use client";

import { useState } from "react";
import { upsertEngagementRule } from "./actions";

interface EngagementRuleModalProps {
  accountId: string;
  accountName: string;
  initialKeywords: string[];
  initialCompetitors: string[];
  onClose: () => void;
}

export function EngagementRuleModal({
  accountId,
  accountName,
  initialKeywords,
  initialCompetitors,
  onClose,
}: EngagementRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [keywords, setKeywords] = useState(initialKeywords.join(", "));
  const [competitors, setCompetitors] = useState(initialCompetitors.join(", "));

  async function handleSave() {
    setLoading(true);
    setError(null);

    const keywordsArray = keywords.split(",").map(k => k.trim()).filter(k => k !== "");
    const competitorsArray = competitors.split(",").map(c => c.trim()).filter(c => c !== "");

    const res = await upsertEngagementRule(accountId, keywordsArray, competitorsArray);

    if (res.success) {
      onClose();
      window.location.reload();
    } else {
      setError(res.error || "Failed to save settings");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl scale-in-center">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            🎯 ターゲット設定
          </h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        <p className="text-xs text-neutral-400 mb-6">
          アカウント <span className="text-blue-400 font-mono">@{accountName}</span> のAI活動のターゲットを指定します。
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              ターゲットキーワード
            </label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="副業, プログラミング, 美容"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-neutral-700 min-h-[80px]"
            />
            <p className="text-[10px] text-neutral-500 mt-1.5">カンマ区切りで入力してください。AIがこれらのキーワードに関連する投稿を探索します。</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              競合・ベンチマークアカウント
            </label>
            <textarea
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              placeholder="@competitor1, @benchmark2"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-neutral-700 min-h-[80px]"
            />
            <p className="text-[10px] text-neutral-500 mt-1.5">カンマ区切りで入力してください。AIがこれらのアカウントのフォロワーを分析し、アプローチします。</p>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 rounded-xl transition-all"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? "保存中..." : "設定を保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
