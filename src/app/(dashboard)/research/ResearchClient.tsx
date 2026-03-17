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

// --- Visual Components ---

function Sparkline({ color = "#3b82f6" }: { color?: string }) {
  return (
    <svg viewBox="0 0 40 12" className="w-10 h-3 overflow-visible">
      <path
        d="M0 10 Q 5 8, 10 9 T 20 4 T 30 6 T 40 1"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="50"
        strokeDashoffset="50"
        className="animate-[dash_1.5s_ease-out_forwards]"
      />
    </svg>
  );
}

function RadarChart({ metrics }: { metrics: NicheSuggestion["metrics"] }) {
  const size = 100;
  const center = size / 2;
  const radius = size * 0.4;
  
  // Angle for each axis (4 points)
  const getPoint = (val: number, angle: number) => {
    const r = (val / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  };

  const axes = [
    { label: "収益", val: metrics.profitability, angle: -Math.PI / 2 },
    { label: "将来", val: metrics.growth, angle: 0 },
    { label: "独自", val: metrics.uniqueness, angle: Math.PI / 2 },
    { label: "簡単", val: metrics.easeOfEntry, angle: Math.PI },
  ];

  const points = axes.map(a => getPoint(a.val, a.angle)).join(" ");
  const gridPoints = [
    axes.map(a => getPoint(100, a.angle)).join(" "),
    axes.map(a => getPoint(75, a.angle)).join(" "),
    axes.map(a => getPoint(50, a.angle)).join(" "),
    axes.map(a => getPoint(25, a.angle)).join(" "),
  ];

  return (
    <div className="relative w-32 h-32">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
        {/* Grids */}
        {gridPoints.map((p, i) => (
          <polygon key={i} points={p} fill="none" stroke="currentColor" strokeWidth="0.5" className="text-neutral-800" />
        ))}
        {/* Axes */}
        {axes.map((a, i) => (
          <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(a.angle)} y2={center + radius * Math.sin(a.angle)} stroke="currentColor" strokeWidth="0.5" className="text-neutral-800" />
        ))}
        {/* Area */}
        <polygon
          points={points}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="#3b82f6"
          strokeWidth="1.5"
          className="animate-in fade-in zoom-in duration-1000"
        />
        {/* Labels (Tiny) */}
        {axes.map((a, i) => {
          const x = center + (radius + 12) * Math.cos(a.angle);
          const y = center + (radius + 12) * Math.sin(a.angle);
          return (
            <text key={i} x={x} y={y} fontSize="6" textAnchor="middle" alignmentBaseline="middle" className="fill-neutral-500 font-bold uppercase overflow-visible">
              {a.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function SNSMockup({ platform, concept, strategy }: { platform: "x" | "instagram", concept: MarketResearchResult["concept"], strategy: MarketResearchResult["strategy"] }) {
  const isX = platform === "x";
  return (
    <div className="bg-black border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl max-w-sm mx-auto animate-in slide-in-from-right-4 duration-700">
      {/* Header Image */}
      <div className={`h-24 ${isX ? "bg-neutral-800" : "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600"} relative`}>
        <div className="absolute -bottom-10 left-4 w-20 h-20 rounded-full border-4 border-black bg-neutral-900 flex items-center justify-center text-2xl">
          {isX ? "🥷" : "📸"}
        </div>
      </div>
      <div className="pt-12 px-5 pb-6 space-y-3">
        <div className="flex justify-between items-start">
           <div>
             <h4 className="font-black text-xl">{concept.name}</h4>
             <p className="text-neutral-500 text-sm">@{concept.name.toLowerCase().replace(/\s+/g, '_')}</p>
           </div>
           <button className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-bold">Follow</button>
        </div>
        <p className="text-sm leading-relaxed">{concept.bio}</p>
        <div className="flex gap-4 text-xs text-neutral-500">
          <span><strong>1.2K</strong> Following</span>
          <span><strong>45.8K</strong> Followers</span>
        </div>
        {!isX && (
          <div className="grid grid-cols-3 gap-1 pt-4">
             {[1,2,3].map(i => <div key={i} className="aspect-square bg-neutral-900 rounded-sm" />)}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Page Component ---

export function ResearchClient() {
  const [step, setStep] = useState<Step>("input");
  const [loading, setLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [keyword, setKeyword] = useState("");
  const [platform, setPlatform] = useState<"x" | "instagram">("x");
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<NicheSuggestion[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [result, setResult] = useState<MarketResearchResult | null>(null);

  useEffect(() => {
    async function fetchTrends() {
      setTrendLoading(true);
      try {
        const res = await getTrendingKeywordsAction();
        if (res.success && res.data) {
          setTrendingKeywords(res.data);
          if (res.updatedAt) {
            setLastUpdated(new Date(res.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch trends", err);
      } finally {
        setTrendLoading(false);
      }
    }
    fetchTrends();
  }, []);

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

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <span className="bg-blue-600/20 text-blue-500 p-2 rounded-xl border border-blue-500/20">🔍</span>
            AI Market Discovery
          </h2>
          <p className="text-neutral-500 text-sm font-medium">収益化の「勝ち筋」をAIと共に見つけ出す</p>
        </div>
        <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-full px-4 py-1.5 gap-3">
           {["input", "suggest", "analysis", "final"].map((s, i) => (
             <div key={s} className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full transition-all duration-500 ${step === s ? "bg-blue-500 ring-4 ring-blue-500/20" : "bg-neutral-800"}`} />
             </div>
           ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-400 text-sm animate-in fade-in zoom-in slide-in-from-top-2">
          ⚠️ {error}
        </div>
      )}

      {/* STEP 0: Input */}
      {step === "input" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                <span>⚡</span> Trending Sparks
              </h3>
              <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-tight">
                {lastUpdated ? `Last updated: ${lastUpdated}` : "Updated Real-time"}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
               {trendLoading ? (
                 Array.from({ length: 4 }).map((_, i) => (
                   <div key={i} className="h-24 bg-neutral-900/50 border border-neutral-800/50 rounded-2xl animate-pulse" />
                 ))
               ) : (
                 trendingKeywords.map((tk, i) => (
                   <button
                     key={i}
                     onClick={() => setKeyword(tk.keyword)}
                     className={`text-left p-5 rounded-2xl border transition-all duration-300 relative group overflow-hidden ${keyword === tk.keyword ? "bg-blue-600/10 border-blue-500/50 shadow-2xl shadow-blue-500/10" : "bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50"}`}
                   >
                     <div className="flex justify-between items-start mb-2">
                       <span className={`font-black tracking-tight leading-tight ${keyword === tk.keyword ? "text-blue-400" : "text-white"}`}>{tk.keyword}</span>
                       <Sparkline color={keyword === tk.keyword ? "#3b82f6" : "#404040"} />
                     </div>
                     <p className="text-[10px] text-neutral-500 font-medium line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300">{tk.description}</p>
                     <div className={`absolute bottom-0 right-0 p-1 text-[8px] font-black uppercase tracking-tighter transition-colors ${keyword === tk.keyword ? "text-blue-500/50" : "text-neutral-800"}`}>{tk.category}</div>
                   </button>
                 ))
               )}
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full" />
            <form onSubmit={handleInitialSubmit} className="space-y-8 relative z-10">
              <div className="space-y-3">
                <label className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">
                  Target Domain
                </label>
                <div className="relative group">
                   <input
                    type="text"
                    required
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="例: ダイエット、AI、節約、副業"
                    className="w-full bg-neutral-950 border-2 border-neutral-800 rounded-3xl px-8 py-6 text-2xl font-black focus:outline-none focus:border-blue-500/50 transition-all text-white placeholder:text-neutral-700 group-hover:border-neutral-700"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-neutral-800 group-focus-within:text-blue-500/50 transition-colors">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21 21-4.3-4.3m0 0A7.5 7.5 0 1 0 6 6a7.5 7.5 0 0 0 10.7 10.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em] ml-1">
                  Launch Platform
                </label>
                <div className="grid grid-cols-2 gap-6">
                  {["x", "instagram"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p as any)}
                      className={`relative py-5 rounded-3xl border-2 font-black text-lg transition-all flex items-center justify-center gap-3 ${platform === p ? "bg-white text-black border-white shadow-2xl shadow-white/10" : "bg-neutral-950 text-neutral-500 border-neutral-800 hover:border-neutral-700"}`}
                    >
                      <span className="text-2xl">{p === "x" ? "𝕏" : "📸"}</span>
                      {p === "x" ? "X (Twitter)" : "Instagram"}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-3xl transition-all disabled:opacity-50 text-2xl shadow-2xl shadow-blue-600/20 active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Analyzing Trends...</span>
                  </div>
                ) : (
                  "Initiate AI Research →"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STEP 1: Suggestions */}
      {step === "suggest" && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="flex items-end justify-between border-b border-neutral-800 pb-6">
            <div>
              <h3 className="text-3xl font-black flex items-center gap-3">
                <span className="text-blue-500">Selection</span> Niche Discovery
              </h3>
              <p className="text-neutral-500 text-sm mt-1 uppercase tracking-widest font-bold">5 High-Profit Candidates Found</p>
            </div>
            <button onClick={() => setStep("input")} className="group flex items-center gap-2 text-[10px] font-black uppercase text-neutral-600 hover:text-white transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
              Start Over
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSelectGenre(s.genre)}
                className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-[2rem] text-left hover:border-blue-500/50 hover:bg-neutral-900 transition-all group relative overflow-hidden flex flex-col md:flex-row items-center gap-10 active:scale-[0.99]"
              >
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-center">
                     <h4 className="text-2xl font-black group-hover:text-blue-400 transition-colors">{s.genre}</h4>
                     <div className="flex items-center gap-2">
                       <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${s.competitionLevel === 'low' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                         {s.competitionLevel === 'low' ? 'Low Competition' : 'Active Market'}
                       </span>
                     </div>
                  </div>
                  <p className="text-neutral-400 leading-relaxed text-sm antialiased">{s.reasoning}</p>
                  <div className="pt-4 flex items-center gap-6">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-neutral-600 uppercase">Profit Score</p>
                       <p className="text-lg font-black text-white">{s.profitabilityScore}%</p>
                    </div>
                    <div className="h-10 w-px bg-neutral-800" />
                    <div className="space-y-1 text-blue-500">
                       <p className="text-[10px] font-black text-blue-500/50 uppercase italic underline decoration-blue-500/20">Action</p>
                       <p className="text-xs font-black">Select Genre →</p>
                    </div>
                  </div>
                </div>
                
                {/* Visual Metric Component */}
                <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800/50 group-hover:border-blue-500/30 transition-colors">
                   <RadarChart metrics={s.metrics} />
                </div>
                
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Analysis */}
      {step === "analysis" && analysis && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <div className="bg-neutral-900 border border-neutral-800 rounded-[3rem] p-12 relative overflow-hidden shadow-2xl">
             <div className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-16">
               <div className="lg:col-span-3 space-y-10">
                 <div className="space-y-2">
                   <div className="flex items-center gap-2 text-blue-500">
                      <div className="w-8 h-px bg-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">{platform} Ecosystem</span>
                   </div>
                   <h3 className="text-4xl font-black text-white leading-tight">市場深層分析レポート</h3>
                   <div className="inline-block px-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl mt-4">
                     <span className="text-neutral-400 text-xs font-bold mr-2">Target Niche:</span>
                     <span className="text-blue-400 font-extrabold">{selectedGenre}</span>
                   </div>
                 </div>

                 <div className="space-y-3">
                   <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                     <span>📈</span> AI Trend Forecast
                 </h4>
                 <div className="bg-neutral-950 rounded-[2rem] p-10 border border-neutral-800/50 relative">
                    <svg viewBox="0 0 100 30" className="w-full h-32 overflow-visible">
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="transparent" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                      <path d="M0 28 Q 10 25, 20 27 T 40 15 T 60 18 T 80 5 T 100 3" fill="none" stroke="url(#grad)" strokeWidth="3" strokeDasharray="200" className="animate-[dash_3s_ease-out_forwards]" strokeDashoffset="0" />
                      <path d="M0 28 Q 10 25, 20 27 T 40 15 T 60 18 T 80 5 T 100 3" fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth="12" />
                      <circle cx="100" cy="3" r="3" fill="#3b82f6" className="animate-pulse shadow-lg" />
                    </svg>
                    <div className="grid grid-cols-4 gap-4 mt-6">
                       {analysis.trends.map((t, i) => (
                         <div key={i} className="text-center">
                            <div className="text-[8px] font-black text-neutral-600 mb-1">Momentum</div>
                            <div className="text-[10px] text-neutral-300 font-black truncate px-2">{t}</div>
                         </div>
                       ))}
                    </div>
                 </div>
                 </div>
               </div>

               <div className="lg:col-span-2 space-y-12 pt-6">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <h4 className="text-xs font-black text-neutral-100 uppercase tracking-widest">ターゲット属性</h4>
                      </div>
                      <p className="text-sm text-neutral-400 leading-relaxed font-medium">{analysis.targetDemographics}</p>
                    </div>

                    <div className="space-y-4 pt-6">
                      <div className="flex items-center gap-2 text-amber-500">
                        <div className="w-2 h-2 bg-amber-500 rounded-full" />
                        <h4 className="text-xs font-black uppercase tracking-widest">市場の空白地点</h4>
                      </div>
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                         <p className="text-sm text-amber-500 font-black italic antialiased leading-relaxed">"{analysis.marketGap}"</p>
                      </div>
                    </div>
                  </div>

                  <button 
                  onClick={handleProceedToFinal}
                  className="w-full bg-white text-black font-black py-5 rounded-3xl transition-all shadow-2xl hover:scale-[1.02] active:scale-[0.98] text-lg"
                >
                  {loading ? "Designing Profile..." : "Finalize Blueprint →"}
                </button>
               </div>
             </div>
             
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[150px] -mr-64 -mt-64" />
          </div>
        </div>
      )}

      {/* STEP 3: Final Result */}
      {step === "final" && result && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 space-y-12">
           <div className="bg-gradient-to-br from-indigo-600 to-blue-800 rounded-[3rem] p-16 text-white relative overflow-hidden shadow-2xl text-center">
              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-xl border border-white/10">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Blueprint Ready</span>
                </div>
                <h3 className="text-5xl font-black tracking-tight leading-tight">勝ち筋の設計図が<br/>完成しました</h3>
                <p className="text-blue-100/70 text-lg font-bold max-w-xl mx-auto">AIが提案するこの構成で、SNSアフィリエイトの第一歩を刻みましょう。</p>
              </div>
              <div className="absolute -left-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-[100px]" />
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-400/20 rounded-full blur-[100px]" />
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                <div className="space-y-8">
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-neutral-500 uppercase tracking-widest border-l-4 border-blue-500 pl-4 mb-8">
                       Visual Mockup
                    </h4>
                    <SNSMockup platform={platform} concept={result.concept} strategy={result.strategy} />
                  </div>
                </div>

                <div className="space-y-12">
                  <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-10 space-y-10 shadow-xl">
                    <div className="space-y-8">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-white uppercase flex items-center gap-3">
                          <span className="text-xs bg-blue-500/20 text-blue-500 p-1 rounded">HT</span>
                          ハッシュタグ戦略
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.strategy.hashtags.map((tag, i) => (
                          <span key={i} className="text-[11px] font-black text-neutral-400 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 hover:text-white transition-colors">#{tag}</span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-8">
                      <h4 className="text-sm font-black text-white uppercase flex items-center gap-3">
                         <span className="text-xs bg-pink-500/20 text-pink-500 p-1 rounded">MX</span>
                         運用コンテンツ比率
                      </h4>
                      <div className="grid grid-cols-1 gap-6">
                        <MixItem label="有益情報 (Engagement)" value={result.strategy.contentMix.educational} color="blue" />
                        <MixItem label="収益化 (Affiliate)" value={result.strategy.contentMix.affiliate} color="pink" />
                        <MixItem label="人間味 (Personal)" value={result.strategy.contentMix.personal} color="emerald" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-600 border border-blue-400/30 rounded-[2rem] p-8 flex items-center justify-between gap-6 shadow-2xl shadow-blue-600/30">
                    <div className="space-y-1">
                      <p className="font-black text-white text-lg leading-tight">準備は整いました</p>
                      <p className="text-blue-100 text-xs font-bold">次はアカウント連携・自動運用設定へ</p>
                    </div>
                    <a href="/accounts" className="bg-black text-white text-xs font-black px-8 py-4 rounded-2xl hover:bg-neutral-900 transition-all flex items-center gap-2 hover:translate-x-1 duration-300">
                      運用の開始
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                    </a>
                  </div>
                </div>
           </div>
        </div>
      )}

      {/* Persistence Loading UI (Step Transition) */}
      {loading && (step === "suggest" || step === "analysis" || step === "final") && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="flex flex-col items-center space-y-10 max-w-sm w-full">
               <div className="relative w-32 h-32">
                  <div className="absolute inset-0 border-[6px] border-blue-500/10 rounded-full" />
                  <div className="absolute inset-0 border-[6px] border-blue-500 border-t-transparent rounded-full animate-spin shadow-2xl shadow-blue-500/20" />
                  <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">
                     🤖
                  </div>
               </div>
               <div className="space-y-4 text-center">
                 <p className="text-blue-500 text-sm font-black uppercase tracking-[0.4em] animate-pulse">Processing Data</p>
                 <p className="text-white text-2xl font-black">AIが戦略を構築中です...</p>
                 <div className="w-64 bg-neutral-900 h-1.5 rounded-full overflow-hidden mt-4 mx-auto">
                    <div className="h-full bg-blue-500 animate-[progress_5s_ease-in-out_infinite]" />
                 </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

function MixItem({ label, value, color }: { label: string; value: number; color: "blue" | "pink" | "emerald" }) {
  const c = {
    blue: "bg-blue-500 shadow-blue-500/30",
    pink: "bg-pink-500 shadow-pink-500/30",
    emerald: "bg-emerald-500 shadow-emerald-500/30",
  };
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{label}</span>
        <span className="text-sm font-black text-white">{value}%</span>
      </div>
      <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
        <div className={`h-full ${c[color]} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
