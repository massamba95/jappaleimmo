-- Espace locataire : user_id sur tenants + table issues + RLS

-- 1. Lier un locataire à un compte auth.users (nullable — locataire peut ne pas être invité)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz;

CREATE INDEX IF NOT EXISTS tenants_auth_user_id_idx ON tenants(user_id);

-- 2. Table des signalements (maintenance / problèmes)
CREATE TABLE IF NOT EXISTS issues (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  lease_id uuid REFERENCES leases(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'OTHER'
    CHECK (category IN ('PLUMBING', 'ELECTRICITY', 'APPLIANCE', 'HEATING', 'STRUCTURE', 'OTHER')),
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  created_at timestamptz DEFAULT now() NOT NULL,
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS issues_org_id_idx ON issues(org_id);
CREATE INDEX IF NOT EXISTS issues_tenant_id_idx ON issues(tenant_id);
CREATE INDEX IF NOT EXISTS issues_status_idx ON issues(status);

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Policies RLS pour issues
CREATE POLICY "org members view issues" ON issues FOR SELECT
  USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND status = 'ACTIVE'));

CREATE POLICY "org members update issues" ON issues FOR UPDATE
  USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND status = 'ACTIVE'));

CREATE POLICY "tenant views own issues" ON issues FOR SELECT
  USING (tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid()));

CREATE POLICY "tenant creates own issues" ON issues FOR INSERT
  WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid()));

-- 3. Policies RLS pour que le locataire voie ses propres données
CREATE POLICY "tenant views self" ON tenants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "tenant views own leases" ON leases FOR SELECT
  USING (tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid()));

CREATE POLICY "tenant views own payments" ON payments FOR SELECT
  USING (lease_id IN (
    SELECT l.id FROM leases l
    JOIN tenants t ON t.id = l.tenant_id
    WHERE t.user_id = auth.uid()
  ));

CREATE POLICY "tenant views own property" ON properties FOR SELECT
  USING (id IN (
    SELECT l.property_id FROM leases l
    JOIN tenants t ON t.id = l.tenant_id
    WHERE t.user_id = auth.uid()
  ));
