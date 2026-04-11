-- ============================================================
-- FIX RLS — Corriger la recursion infinie
-- A executer dans Supabase SQL Editor
-- ============================================================

-- 1. Supprimer les policies problematiques
DROP POLICY IF EXISTS "Super admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Members can view their organization" ON organizations;
DROP POLICY IF EXISTS "Anyone can insert organization on signup" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;

DROP POLICY IF EXISTS "Members can view memberships in their org" ON memberships;
DROP POLICY IF EXISTS "Anyone can insert membership on signup" ON memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON memberships;

DROP POLICY IF EXISTS "Admins can view subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Super admins can manage subscriptions" ON subscriptions;

DROP POLICY IF EXISTS "Super admins can view super_admins" ON super_admins;

-- 2. Desactiver RLS sur super_admins (table petite, pas besoin)
ALTER TABLE super_admins DISABLE ROW LEVEL SECURITY;

-- 3. Recreer les policies sans recursion

-- Organizations
CREATE POLICY "org_select" ON organizations FOR SELECT USING (
  id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "org_insert" ON organizations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "org_update" ON organizations FOR UPDATE USING (
  id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role = 'ADMIN')
);

-- Memberships
CREATE POLICY "membership_select" ON memberships FOR SELECT USING (
  org_id IN (SELECT m.org_id FROM memberships m WHERE m.user_id = auth.uid())
);

CREATE POLICY "membership_insert" ON memberships FOR INSERT
  WITH CHECK (true);

CREATE POLICY "membership_update" ON memberships FOR UPDATE USING (
  org_id IN (SELECT m.org_id FROM memberships m WHERE m.user_id = auth.uid() AND m.role = 'ADMIN')
);

CREATE POLICY "membership_delete" ON memberships FOR DELETE USING (
  org_id IN (SELECT m.org_id FROM memberships m WHERE m.user_id = auth.uid() AND m.role = 'ADMIN')
);

-- Subscriptions
CREATE POLICY "sub_select" ON subscriptions FOR SELECT USING (
  org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "sub_insert" ON subscriptions FOR INSERT
  WITH CHECK (true);

-- 4. Mettre a jour les policies properties et tenants (supprimer ref super_admins)
DROP POLICY IF EXISTS "Members can view org properties" ON properties;
DROP POLICY IF EXISTS "Members can insert org properties" ON properties;
DROP POLICY IF EXISTS "Members can update org properties" ON properties;
DROP POLICY IF EXISTS "Admins and managers can delete org properties" ON properties;

CREATE POLICY "prop_select" ON properties FOR SELECT USING (
  org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "prop_insert" ON properties FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "prop_update" ON properties FOR UPDATE USING (
  org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "prop_delete" ON properties FOR DELETE USING (
  org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
);

DROP POLICY IF EXISTS "Members can view org tenants" ON tenants;
DROP POLICY IF EXISTS "Members can insert org tenants" ON tenants;
DROP POLICY IF EXISTS "Members can update org tenants" ON tenants;
DROP POLICY IF EXISTS "Admins and managers can delete org tenants" ON tenants;

CREATE POLICY "tenant_select" ON tenants FOR SELECT USING (
  org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "tenant_insert" ON tenants FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "tenant_update" ON tenants FOR UPDATE USING (
  org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())
);

CREATE POLICY "tenant_delete" ON tenants FOR DELETE USING (
  org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
);
