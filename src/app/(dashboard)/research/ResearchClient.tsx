"use client";

import { useState, useEffect } from "react";
import { 
  getGenreSuggestionsAction, 
  getMarketAnalysisAction, 
  runResearchAction,
  getTrendingKeywordsAction
} from "./actions";
import { MarketResearchResult, NicheSuggestion, MarketAnalysis, TrendingKeyword } from "@/lib/ai/research";

type Step = "input" | "suggest" | "analysis" | "final";

export function ResearchClient() {
  const [step, setStep] = useState<Step>("input");
  const [loading, setLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [keyword, setKeyword] = useState("");
  const [platform, setPlatform] = useState<"x" | "instagram">("x");
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>([]);
  const [suggestions, setSuggestions] = useState<NicheSuggestion[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [result, setResult] = useState<MarketResearchResult | null>(null);

  // Fetch trends on mount
  useEffect(() => {
    async function fetchTrends() {
      setTrendLoading(true);
      try {
        const res = await getTrendingKeywordsAction();
        if (res.success && res.data) {
          setTrendingKeywords(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch trends", err);
      } finally {
        setTrendLoading(false);
      }
    }
    fetchTrends();
  }, []);

  // --- Step Handlers ---

  async function handleInitialSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await getGenreSuggestionsAction(keyword);
      if (res.success && res.data) {
        setSuggestions(res.data);
        setStep("suggest");
      } else {
        setError(res.error || "ジャンル提案に失敗しました。");
      }
    } catch (err) {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectGenre(genre: string) {
    setSelectedGenre(genre);
    setLoading(true);
    setError(null);
    try {
      const res = await getMarketAnalysisAction(genre, platform);
      if (res.success && res.data) {
        setAnalysis(res.data);
        setStep("analysis");
      } else {
        setError(res.error || "分析に失敗しました。");
      }
    } catch (err) {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleProceedToFinal() {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("genre", selectedGenre);
      formData.append("platform", platform);
      
      const res = await runResearchAction(formData);
      if (res.success && res.data) {
        setResult(res.data);
        setStep("final");
      } else {
        setError(res.error || "最終設計に失敗しました。");
      }
    } catch (err) {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  // --- UI Renderers ---

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>🔍</span> 市場調査・アカウント設計
          </h2>
          <p className="text-neutral-400 mt-1 text-sm">
            AIが最適なSNS運用戦略を段階的に提案します。
          </p>
        </div>
        <div className="flex gap-2">
           {[ "input", "suggest", "analysis", "final"].map((s, i) => (
             <div key={s} className={`w-3 h-3 rounded-full transition-colors ${step === s ? "bg-blue-500" : "bg-neutral-800"}`} />
           ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm animate-in fade-in zoom-in duration-300">
          ⚠️ {error}
        </div>
      )}

      {/* STEP 0: Input */}
      {step === "input" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          {/* Trend Suggestions Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
              <span>🔥</span> AIが選ぶ今熱いキーワード
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
               {trendLoading ? (
                 Array.from({ length: 4 }).map((_, i) => (
                   <div key={i} className="h-20 bg-neutral-900 border border-neutral-800 rounded-xl animate-pulse" />
                 ))
               ) : (
                 trendingKeywords.map((tk, i) => (
                   <button
                     key={i}
                     onClick={() => setKeyword(tk.keyword)}
                     className={`text-left p-4 rounded-xl border transition-all text-xs space-y-2 hover:scale-[1.02] active:scale-[0.98] ${keyword === tk.keyword ? "bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/10" : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"}`}
                   >
                     <div className="flex justify-between items-start">
                       <span className="font-bold text-white leading-tight">{tk.keyword}</span>
                     </div>
                     <span className="block text-[10px] text-neutral-500 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800 w-fit">{tk.category}</span>
                   </button>
                 ))
               )}
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-xl">
            <form onSubmit={handleInitialSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">
                  興味のある分野やキーワード
                </label>
                <input
                  type="text"
                  required
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="例: ダイエット、AI、節約、副業"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-neutral-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-400 uppercase tracking-widest">
                  プラットフォーム
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPlatform("x")}
                    className={`py-4 rounded-xl border font-bold transition-all ${platform === "x" ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20" : "bg-neutral-950 text-neutral-500 border-neutral-800 hover:border-neutral-700"}`}
                  >
                    X (Twitter)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatform("instagram")}
                    className={`py-4 rounded-xl border font-bold transition-all ${platform === "instagram" ? "bg-pink-600 text-white border-pink-500 shadow-lg shadow-pink-500/20" : "bg-neutral-950 text-neutral-500 border-neutral-800 hover:border-neutral-700"}`}
                  >
                    Instagram
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black hover:bg-neutral-200 font-black py-5 rounded-2xl transition-all disabled:opacity-50 text-xl shadow-2xl"
              >
                {loading ? "AIがアイデアを深掘り中..." : "収益化のヒントを探す →"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STEP 1: Suggestions */}
      {step === "suggest" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">🎯 参入すべきニッチジャンルの提案</h3>
            <button onClick={() => setStep("input")} className="text-xs text-neutral-500 underline">やり直す</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSelectGenre(s.genre)}
                className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl text-left hover:border-blue-500/50 transition-all group overflow-hidden relative"
              >
                <div className="flex justify-between items-start mb-3">
                   <h4 className="text-lg font-black group-hover:text-blue-400 transition-colors">{s.genre}</h4>
                   <div className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/20">
                     推奨度: {s.profitabilityScore}%
                   </div>
                </div>
                <p className="text-sm text-neutral-400 line-clamp-2 mb-4">{s.reasoning}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-neutral-500">
                    競合: <span className={s.competitionLevel === "low" ? "text-emerald-400" : s.competitionLevel === "medium" ? "text-amber-400" : "text-red-400"}>
                      {s.competitionLevel === "low" ? "穴場" : s.competitionLevel === "medium" ? "普通" : "激戦"}
                    </span>
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-all" style={{ width: `${s.profitabilityScore}%` }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Analysis */}
      {step === "analysis" && analysis && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
             <div className="relative z-10">
               <span className="text-xs font-bold uppercase tracking-widest bg-blue-500 px-3 py-1 rounded-full">{selectedGenre}</span>
               <h3 className="text-3xl font-black mt-4">市場分析レポート</h3>
               <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-neutral-500 flex items-center gap-2 uppercase tracking-tighter">
                      <span>📉</span> トレンド推移 (AI予測)
                    </h4>
                    <svg viewBox="0 0 100 30" className="w-full h-24 overflow-visible">
                      <path d="M0 25 Q 10 20, 20 22 T 40 10 T 60 15 T 80 5 T 100 2" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="100" className="animate-[dash_2s_ease-out_forwards]" strokeDashoffset="0" />
                      <circle cx="100" cy="2" r="2" fill="#3b82f6" className="animate-pulse" />
                    </svg>
                    <div className="flex flex-wrap gap-2">
                       {analysis.trends.map((t, i) => <span key={i} className="text-xs text-neutral-300 bg-white/5 px-2 py-1 rounded-lg border border-white/10">{t}</span>)}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-tighter mb-2">ターゲット属性</h4>
                      <p className="text-sm text-neutral-200">{analysis.targetDemographics}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-tighter mb-2 text-amber-400">市場の「隙間」</h4>
                      <p className="text-sm text-amber-500/80 italic">"{analysis.marketGap}"</p>
                    </div>
                  </div>
               </div>
               <button 
                 onClick={handleProceedToFinal}
                 className="mt-10 w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg"
               >
                 {loading ? "プランニング中..." : "このジャンルで設計を開始する →"}
               </button>
             </div>
             <div className="absolute right-0 bottom-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          </div>
        </div>
      )}

      {/* STEP 3: Final Result */}
      {step === "final" && result && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
           <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 text-center py-6">
                <span className="text-xs font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">Research Complete</span>
                <h3 className="text-4xl font-black mt-4">勝ち筋が見つかりました</h3>
                <p className="mt-2 text-emerald-100 italic">あなたのアカウント設計が完了しました。次は詳細設定に移りましょう。</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                  <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-tighter mb-4 flex items-center gap-2">
                    <span>👤</span> アカウント案: {result.concept.name}
                  </h4>
                  <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800 italic text-neutral-300">
                    "{result.concept.bio}"
                  </div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                  <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-tighter mb-4 flex items-center gap-2">
                    <span>📈</span> 運用ミックス
                  </h4>
                  <div className="space-y-4">
                    <MixItem label="有益情報" value={result.strategy.contentMix.educational} color="blue" />
                    <MixItem label="収益化" value={result.strategy.contentMix.affiliate} color="pink" />
                    <MixItem label="人間味" value={result.strategy.contentMix.personal} color="emerald" />
                  </div>
                </div>
           </div>

           <div className="bg-blue-600/10 border border-blue-600/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-bold">このコンセプトをデータベースに保存しました。</p>
                <p className="text-xs text-neutral-400 mt-1">次はアカウントを連携しましょう。</p>
              </div>
              <a href="/accounts" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-2 rounded-xl transition-all">
                アカウントを連携する →
              </a>
          </div>
        </div>
      )}

      {loading && step !== "final" && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-neutral-900 border border-blue-500/20 rounded-3xl p-10 flex flex-col items-center space-y-6 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
               <div className="relative w-20 h-20">
                  <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
               </div>
               <p className="text-blue-400 font-bold animate-pulse text-center">AIが高度な分析を実行中...</p>
               <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 animate-[progress_10s_ease-in-out_infinite]" />
               </div>
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
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{label}</span>
        <span className="text-sm font-black">{value}%</span>
      </div>
      <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
        <div className={`h-full ${c[color]} rounded-full transition-all duration-1000`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
