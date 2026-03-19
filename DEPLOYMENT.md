# SNS Ninja 本番デプロイ手順

SNS Ninjaは「Webフロントエンド」と「バックグラウンドワーカー」の2階層アーキテクチャに分かれています。以下の手順でそれぞれを適切なプラットフォームへデプロイしてください。

## 1. 必要な外部サービス
デプロイにあたり、以下のサービスの準備が必要です。
- **GitHub**: ソースコードのホスティング
- **Supabase**: データベース（PostgreSQL）と認証（Auth）、Storage
- **Upstash (またはRenderのRedis)**: BullMQ用のRedisサーバー環境
- **Vercel**: Next.js (管理ダッシュボード) のデプロイ先
- **Render**: バックグラウンドワーカー (Playwright自動化エンジン) のデプロイ先

## 2. データベースのセットアップ (Supabase)
本番用のSupabaseプロジェクトを作成し、以下の情報を取得します。
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` 
- `DATABASE_URL` (※設定 > Database > Connection pool の TransactionモードURLを利用)

ローカル環境から、本番DBに向けてマイグレーションを実行してテーブルを構築してください。
```bash
# .env.local に本番DBのURLなどを一時的に書き換えて実行
npx tsx src/db/migrate-v4.ts
```

## 3. Webアプリのデプロイ (Vercel)
Vercelのダッシュボードで、GitHub上の `sns-ninja` リポジトリをインポートします。
1. **Framework Preset**: Next.js
2. **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL`
   - `GEMINI_API_KEY` (AI生成用)
   - `FAL_KEY` (画像生成用)
   - `REDIS_URL` (Upstash等で取得したRedisのURL)
3. 「Deploy」をクリックして完了を待ちます。

## 4. 自動化ワーカーのデプロイ (Render)
BullMQでキューをさばき、PlaywrightでX/Instagramを自動操作する常駐サーバーを構築します。
※Render以外（Railway, Fly.io）でもDockerが動く環境なら対応可能です。

1. [Renderのダッシュボード](https://dashboard.render.com/) にログインし、「**New +**」から「**Background Worker**」を選択します。
2. 対象のGitHubリポジトリ（sns-ninja）を連携します。
3. **設定内容**:
   - **Name**: sns-ninja-worker (任意)
   - **Environment**: `Docker` (※Node.jsではなくDockerを選択)
   - **Dockerfile path**: `Dockerfile.worker`
4. **Environment Variables** (Vercelで設定した物と同じものを設定):
   - `DATABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `FAL_KEY`
   - `REDIS_URL`
5. 「**Create Background Worker**」をクリックします。
6. (デプロイが完了すると) Render側で `Dockerfile.worker` がビルドされ、自動的に24時間稼働のワーカープロセス(`npm run worker`)が起動を開始します。

## 5. デプロイの検証
ダッシュボード（VercelのURL）にアクセスし、アカウントを登録します。
自動投稿(`enableAutoPost`)やターゲット設定などを行い、ダッシュボード上にデータが保存されるか確認してください。
また、自動ポスト（翌日の朝8時(UTC)）、あるいは手動実行スクリプトによるキューへの追加時に、Render側のワーカーログで正常にPlaywrightが立ち上がり、処理を行っているかを確認してください。
