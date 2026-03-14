---
name: SNS Ninja PRD
description: |
  X・Instagramアフィリエイト完全自動化システム「SNS Ninja」の要件定義書。
  マルチテナント対応、AIコンテンツ生成（Gemini 2.5 Pro）、アンチBAN仕様、
  Human-in-the-Loopダッシュボードを含む完全なシステム設計書。
  2026年最適技術スタック（Next.js 14+、Supabase、Playwright Stealth）を採用。
keywords:
  - affiliate
  - automation
  - x-twitter
  - instagram
  - multi-tenant
  - ai-content-generation
  - anti-ban
  - nextjs
  - supabase
  - gemini-2.5
---

# SNS Ninja 要件定義書

## プロジェクト概要
**SNS Ninja**は、X（旧Twitter）とInstagramのアフィリエイト収益を完全自動化する買い切り型SaaSプロダクトです。

### 収益目標
- **Phase 1（30日）**: $500-1,000/月
- **Phase 2（3ヶ月）**: $3,000-5,000/月
- **Phase 3（6ヶ月）**: $10,000+/月

## 使用方法
ユーザーが以下のキーワードを含む質問をした場合、
references/ディレクトリの該当ファイルを参照してください：

| キーワード | 参照ファイル |
|-----------|-------------|
| "アーキテクチャ"、"システム構成" | references/03-architecture.md |
| "DB設計"、"データベース"、"ER図" | references/04-database-schema.md |
| "アンチBAN"、"セキュリティ"、"検出回避" | references/05-anti-ban.md |
| "技術スタック"、"使用技術" | references/02-tech-stack.md |
| "UI/UX"、"ダッシュボード"、"デザイン" | references/06-ui-ux.md |
| "ロードマップ"、"実装計画" | references/07-roadmap.md |
| "概要"、"ビジョン"、"収益化" | references/01-project-overview.md |

## 重要な制約
1. **マルチテナント分離**: PostgreSQLのRow-Level Securityで実装
2. **レート制限**: BullMQ + Redisで管理（X: 30-50いいね/時、IG: 200DM/時）
3. **人間行動シミュレーション**: 必須（actionIntervals、指紋偽装）
4. **HITLフロー**: すべての自動投稿は承認待ち状態から開始

## ドキュメント構造
- @references/01-project-overview.md - プロジェクト概要・収益戦略
- @references/02-tech-stack.md - 2026年最適技術スタック
- @references/03-architecture.md - システムアーキテクチャ
- @references/04-database-schema.md - ER図・DB設計
- @references/05-anti-ban.md - アンチBAN・セキュリティ要件
- @references/06-ui-ux.md - UI/UX設計（HITLダッシュボード）
- @references/07-roadmap.md - 30日実装ロードマップ

## 技術スタック概要
- **フロントエンド**: Next.js 14+ (App Router), TypeScript, Tailwind, shadcn/ui
- **バックエンド**: Next.js API Routes, tRPC, BullMQ, Inngest
- **データベース**: Supabase (PostgreSQL 15+), Prisma ORM, Row-Level Security
- **AI**: Gemini 2.5 Pro/Flash, Flux 2 / Stable Diffusion 3.5
- **自動化**: Playwright + puppeteer-extra-plugin-stealth, Browserless Cloud
- **インフラ**: Vercel (Edge Functions), Upstash Redis, 住宅用プロキシ
