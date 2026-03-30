-- 1. Add tenant_id to engagement_logs to support consistent RLS
-- (Note: If this table already has data, we would need a default value or handle it carefully. 
-- Assuming fresh dev/prod environment or manageable data set.)
ALTER TABLE engagement_logs ADD COLUMN tenant_id uuid;

-- Update existing logs if any (assuming account -> tenant relationship)
UPDATE engagement_logs el
SET tenant_id = a.tenant_id
FROM accounts a
WHERE el.account_id = a.id;

-- Make it NOT NULL after update
ALTER TABLE engagement_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE engagement_logs ADD CONSTRAINT engagement_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 2. Enable RLS on remaining tables
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_cache ENABLE ROW LEVEL SECURITY;

-- 3. Create isolation policies

-- Concepts Policy
CREATE POLICY "tenant_isolation_concepts" ON concepts
FOR ALL USING (tenant_id = auth.uid());

-- Engagement Rules Policy
CREATE POLICY "tenant_isolation_engagement_rules" ON engagement_rules
FOR ALL USING (tenant_id = auth.uid());

-- Engagement Logs Policy
CREATE POLICY "tenant_isolation_engagement_logs" ON engagement_logs
FOR ALL USING (tenant_id = auth.uid());

-- Trend Cache Policy (Read-only for all authenticated users, write for service_role only)
CREATE POLICY "trend_cache_read_authenticated" ON trend_cache
FOR SELECT TO authenticated USING (true);

-- Indexes for performance (as mentioned in task list)
CREATE INDEX IF NOT EXISTS idx_concepts_tenant_id ON concepts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_engagement_rules_tenant_id ON engagement_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_engagement_logs_tenant_id ON engagement_logs(tenant_id);
