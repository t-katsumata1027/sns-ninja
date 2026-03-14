# 4. データベース設計・ER図

## 4.1 テーブル構成概要
- **TENANTS**: 買い切りユーザー（テナント）ごとの設定管理 [cite: 400]
- **ACCOUNTS**: X/Instagramのアカウント情報（暗号化トークン、指紋、プロキシ設定） [cite: 418, 424, 426]
- **POSTS**: 投稿内容、予約日時、ステータス管理 [cite: 443, 453]
- **DM_MESSAGES**: インテント分析済みのDM履歴 [cite: 495, 503]
- **PROMPT_TEMPLATES**: 投稿ジャンルごとのAIプロンプト管理 [cite: 470, 582]

## 4.2 Row-Level Security (RLS) ポリシー
テナント間のデータ漏洩を完全に防ぐため、すべてのテーブルに以下のポリシーを適用します [cite: 584]。
```sql
CREATE POLICY tenant_isolation ON posts FOR ALL
USING (tenant_id = current_setting('app.current_tenant')::uuid);

