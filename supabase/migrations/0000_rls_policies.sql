-- 1. Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- 2. Create policies using auth.uid() as the tenant_id 
-- (Assuming 1-to-1 mapping where the User's Supabase Auth UID == their Tenant ID)

-- Tenants Policy: A user can only see/modify their own tenant record
CREATE POLICY "tenant_isolation_tenants" ON tenants
FOR ALL USING (id = auth.uid());

-- Accounts Policy
CREATE POLICY "tenant_isolation_accounts" ON accounts
FOR ALL USING (tenant_id = auth.uid());

-- Posts Policy
CREATE POLICY "tenant_isolation_posts" ON posts
FOR ALL USING (tenant_id = auth.uid());

-- DM Messages Policy
CREATE POLICY "tenant_isolation_dm_messages" ON dm_messages
FOR ALL USING (tenant_id = auth.uid());

-- Prompt Templates Policy
CREATE POLICY "tenant_isolation_prompt_templates" ON prompt_templates
FOR ALL USING (tenant_id = auth.uid());
