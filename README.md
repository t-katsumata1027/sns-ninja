# SNS Ninja ⚡

> **Human-in-the-Loop SNS アフィリエイト全自動収益化システム**  
> Next.js + Supabase + Gemini AI + Playwright Stealth + BullMQ

## 概要

SNS Ninjaは、X（旧Twitter）・Instagramを対象とした個人開発者向けSNSアフィリエイト自動化プラットフォームです。AIによるコンテンツ生成からスケジューリング・投稿・DM自動返信まで、HITLフローを通じて安全に自動化します。

### 主な機能

| 機能 | 説明 |
|---|---|
| 🤖 AIコンテンツ生成 | Gemini 2.5 Pro によるプラットフォーム最適化投稿 |
| 🖼️ AI画像生成 | 投稿趣旨に沿った画像を自動生成して添付 |
| 🎯 アカウント運用モード | アフィリエイト特化、または既存アカウント育成（エンゲージメント中心）の選択機能 |
| 🔐 アンチBAN対策 | Playwright Stealth + 住宅用プロキシ + レート制限 |
| 👆 HITLダッシュボード | AIが生成した投稿を承認・編集・却下 |
| 📊 収益モニタリング | アカウント健全性・投稿パフォーマンス追跡 |
| 🏢 マルチテナント | RLS (Row-Level Security) によるデータ完全分離 |

---

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **認証 / DB**: Supabase (Auth + PostgreSQL + RLS)
- **ORM**: Drizzle ORM
- **AI**: Gemini 2.5 Pro (@google/generative-ai)
- **キュー**: BullMQ + Redis
- **自動化**: Playwright Stealth (playwright-extra)
- **スタイル**: TailwindCSS 4

---

## セットアップ

### 1. 環境変数

`.env.local.example` をコピーして `.env.local` を作成:

```bash
cp .env.local.example .env.local
```

必要な変数を設定してください:

```env
NEXT_PUBLIC_SUPABASE_URL=         # Supabase プロジェクトURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase Anon Key
DATABASE_URL=                     # PostgreSQL 接続URL
ENCRYPTION_KEY=                   # 32文字以上のランダム文字列 (SNSトークン暗号化用)
GEMINI_API_KEY=                   # Google AI Studio APIキー
REDIS_HOST=localhost               # Redis ホスト
REDIS_PORT=6379                    # Redis ポート
REDIS_PASSWORD=                    # Redis パスワード (任意)
```

### 2. パッケージインストール

```bash
npm install
```

### 3. データベースセットアップ

Supabase プロジェクトを作成し、以下を実行:

```bash
# テーブル作成 (Drizzle)
npx drizzle-kit push

# RLSポリシーを適用
psql $DATABASE_URL -f supabase/migrations/0000_rls_policies.sql
```

### 4. 開発サーバー起動

```bash
npm run dev
```

### 5. BullMQ ワーカー起動 (別ターミナル)

ローカルで Redis を起動してから:

```bash
node --loader tsx src/lib/queue/worker.ts
```

---

## アーキテクチャ

```
Next.js App Router
    └── Edge Middleware (Auth)
        ├── API Routes (/api/*)
        │   ├── POST /api/ai/generate   → Gemini でコンテンツ生成
        │   ├── PATCH /api/posts/[id]/approve → HITL承認 + BullMQへ
        │   └── POST /api/dm/[id]/reply → DM インテント分析 + 返信キュー
        └── BullMQ Worker (standalone)
            └── Playwright Stealth → X/Instagram 自動投稿
```

---

## AGENTS.md (開発ガイドライン)

- マルチテナント分離 (RLS) を常に意識せよ。
- アンチBAN対策（レート制限、人間行動シミュレーション）は必須実装。
- HITL (Human-in-the-Loop) フローを尊重。
