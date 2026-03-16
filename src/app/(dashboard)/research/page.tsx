"use client";

import { useState } from "react";
import { runResearchAction } from "./actions";
import { MarketResearchResult } from "@/lib/ai/research";

export default function ResearchPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarketResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const res = await runResearchAction(formData);

    if (res.success && res.data) {
      setResult(res.data);
    } else {
      setError(res.error || "リサーチに失敗しました。");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold">🔍 市場調査・アカウント設計</h2>
        <p className="text-neutral-400 mt-1 text-sm">AIが最適なSNS運用戦略を提案します。</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                参入ジャンル
              </label>
              <input
                name="genre"
                type="text"
                required
                placeholder="例: 美容AIツール、ガジェット、節約術"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-neutral-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                プラットフォーム
              </label>
              <select
                name="platform"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
              >
                <option value="x">X (Twitter)</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
          >
            {loading ? "AIが市場を分析中..." : "AIリサーチを開始する →"}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
          {/* Concept Header */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <span className="text-xs font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">Account Concept</span>
                <h3 className="text-3xl font-black mt-4">{result.concept.name}</h3>
                <p className="mt-2 text-blue-100 max-w-2xl">{result.concept.description}</p>
              </div>
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Section */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-tighter mb-4 flex items-center gap-2">
                <span>👤</span> プロフィール (Bio)
              </h4>
              <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800 italic text-neutral-300">
                "{result.concept.bio}"
              </div>
              <p className="mt-4 text-xs text-neutral-500">
                <strong>ビジュアルイメージ:</strong><br/>
                {result.concept.identity}
              </p>
            </div>

            {/* Growth Strategy */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-tighter mb-4 flex items-center gap-2">
                <span>📈</span> 成長戦略
              </h4>
              <p className="text-sm text-neutral-300 mb-4">{result.growth.engagementStrategy}</p>
              <div className="space-y-2">
                  <p className="text-xs font-semibold text-neutral-500 uppercase">狙うべきキーワード</p>
                  <div className="flex flex-wrap gap-2">
                    {result.growth.keywords.map(kw => (
                       <span key={kw} className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20">{kw}</span>
                    ))}
                  </div>
              </div>
            </div>
          </div>

          {/* Engagement Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-tighter flex items-center gap-2">
                <span>⚡</span> 運用ミックス & ハッシュタグ
              </h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
               <MixItem label="有益情報" value={result.strategy.contentMix.educational} color="blue" />
               <MixItem label="収益化" value={result.strategy.contentMix.affiliate} color="pink" />
               <MixItem label="人間味" value={result.strategy.contentMix.personal} color="emerald" />
            </div>

            <div className="flex flex-wrap gap-2">
                {result.strategy.hashtags.map(tag => (
                  <span key={tag} className="text-xs text-neutral-500 hover:text-white transition-colors">#{tag}</span>
                ))}
            </div>
          </div>
          
          {/* CTA */}
          <div className="bg-blue-600/10 border border-blue-600/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-bold">このコンセプトで運用を開始しますか？</p>
                <p className="text-xs text-neutral-400 mt-1">次はアカウントを連携し、AIプロンプトを設定しましょう。</p>
              </div>
              <a href="/accounts" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-2 rounded-xl transition-all">
                アカウントを連携する →
              </a>
          </div>
        </div>
      )}
    </div>
  );
}

function MixItem({ label, value, color }: { label: string; value: number; color: "blue" | "pink" | "emerald" }) {
  const c = {
    blue: "bg-blue-500 shadow-blue-500/20",
    pink: "bg-pink-500 shadow-pink-500/20",
    emerald: "bg-emerald-500 shadow-emerald-500/20",
  };
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-xs font-bold text-neutral-400">{label}</span>
        <span className="text-lg font-black">{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
        <div className={`h-full ${c[color]} rounded-full`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
