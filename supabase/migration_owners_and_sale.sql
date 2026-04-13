-- ============================================================
-- MIGRATION : Propriétaires tiers + Vente de biens
-- A executer dans Supabase SQL Editor
-- ============================================================

-- 1. Table owners (propriétaires tiers des biens)
CREATE TABLE owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_owners_org_id ON owners(org_id);

-- 2. Ajouter listing_type, sale_price, owner_id sur properties
ALTER TABLE properties
  ADD COLUMN listing_type TEXT NOT NULL DEFAULT 'RENT' CHECK (listing_type IN ('RENT', 'SALE', 'BOTH')),
  ADD COLUMN sale_price INTEGER,
  ADD COLUMN owner_id UUID REFERENCES owners(id) ON DELETE SET NULL;

-- 3. Ajouter SOLD au statut des biens
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE properties ADD CONSTRAINT properties_status_check
  CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'SOLD'));

-- 4. RLS sur owners
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org owners"
  ON owners FOR SELECT USING (
    org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert org owners"
  ON owners FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update org owners"
  ON owners FOR UPDATE USING (
    org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins and managers can delete org owners"
  ON owners FOR DELETE USING (
    org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
  );
