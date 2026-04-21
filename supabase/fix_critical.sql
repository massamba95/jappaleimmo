-- ============================================================
-- FIX CRITIQUE — Recursion RLS + handle_new_user
-- Executer dans Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. SECURITY DEFINER — fonctions qui bypasses RLS (pas de recursion)
-- ===================================================================
CREATE OR REPLACE FUNCTION public.auth_org_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT org_id FROM public.memberships WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_org_admin_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT org_id FROM public.memberships
  WHERE user_id = auth.uid() AND role IN ('ADMIN', 'MANAGER');
$$;

CREATE OR REPLACE FUNCTION public.auth_tenant_id() RETURNS uuid
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM public.tenants WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_tenant_property_ids() RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT DISTINCT property_id FROM public.leases
  WHERE tenant_id = public.auth_tenant_id() AND property_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.auth_tenant_lease_ids() RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM public.leases WHERE tenant_id = public.auth_tenant_id();
$$;


-- 2. ORGANIZATIONS — remplacer la policy qui pointe vers memberships
-- =================================================================
DROP POLICY IF EXISTS "org_select" ON organizations;
DROP POLICY IF EXISTS "org_update" ON organizations;

CREATE POLICY "org_select" ON organizations FOR SELECT USING (
  id IN (SELECT public.auth_org_ids())
);

CREATE POLICY "org_update" ON organizations FOR UPDATE USING (
  id IN (SELECT public.auth_org_admin_ids())
);


-- 3. MEMBERSHIPS — remplacer la policy auto-referentielle
-- =======================================================
DROP POLICY IF EXISTS "membership_select" ON memberships;
DROP POLICY IF EXISTS "membership_update" ON memberships;
DROP POLICY IF EXISTS "membership_delete" ON memberships;

CREATE POLICY "membership_select" ON memberships FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
);

CREATE POLICY "membership_update" ON memberships FOR UPDATE USING (
  org_id IN (SELECT public.auth_org_admin_ids())
);

CREATE POLICY "membership_delete" ON memberships FOR DELETE USING (
  org_id IN (SELECT public.auth_org_admin_ids())
);


-- 4. SUBSCRIPTIONS
-- ================
DROP POLICY IF EXISTS "sub_select" ON subscriptions;

CREATE POLICY "sub_select" ON subscriptions FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
);


-- 5. PROPERTIES — agence + locataire
-- ====================================
DROP POLICY IF EXISTS "prop_select" ON properties;
DROP POLICY IF EXISTS "tenant views own property" ON properties;

CREATE POLICY "prop_select" ON properties FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
  OR id IN (SELECT public.auth_tenant_property_ids())
);

DROP POLICY IF EXISTS "prop_insert" ON properties;
CREATE POLICY "prop_insert" ON properties FOR INSERT WITH CHECK (
  org_id IN (SELECT public.auth_org_ids())
);

DROP POLICY IF EXISTS "prop_update" ON properties;
CREATE POLICY "prop_update" ON properties FOR UPDATE USING (
  org_id IN (SELECT public.auth_org_ids())
);

DROP POLICY IF EXISTS "prop_delete" ON properties;
CREATE POLICY "prop_delete" ON properties FOR DELETE USING (
  org_id IN (SELECT public.auth_org_admin_ids())
);


-- 6. TENANTS — agence + locataire (se voir lui-meme)
-- ===================================================
DROP POLICY IF EXISTS "tenant_select" ON tenants;
DROP POLICY IF EXISTS "tenant views self" ON tenants;

CREATE POLICY "tenant_select" ON tenants FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "tenant_insert" ON tenants;
CREATE POLICY "tenant_insert" ON tenants FOR INSERT WITH CHECK (
  org_id IN (SELECT public.auth_org_ids())
);

DROP POLICY IF EXISTS "tenant_update" ON tenants;
CREATE POLICY "tenant_update" ON tenants FOR UPDATE USING (
  org_id IN (SELECT public.auth_org_ids())
);

DROP POLICY IF EXISTS "tenant_delete" ON tenants;
CREATE POLICY "tenant_delete" ON tenants FOR DELETE USING (
  org_id IN (SELECT public.auth_org_admin_ids())
);


-- 7. LEASES — via property_id (pas de colonne org_id sur leases)
-- ==============================================================
DROP POLICY IF EXISTS "Users can view leases for their properties" ON leases;
DROP POLICY IF EXISTS "Users can insert leases for their properties" ON leases;
DROP POLICY IF EXISTS "Users can update leases for their properties" ON leases;
DROP POLICY IF EXISTS "Users can delete leases for their properties" ON leases;
DROP POLICY IF EXISTS "tenant views own leases" ON leases;
DROP POLICY IF EXISTS "lease_select" ON leases;
DROP POLICY IF EXISTS "lease_insert" ON leases;
DROP POLICY IF EXISTS "lease_update" ON leases;
DROP POLICY IF EXISTS "lease_delete" ON leases;

CREATE POLICY "lease_select" ON leases FOR SELECT USING (
  property_id IN (
    SELECT id FROM properties WHERE org_id IN (SELECT public.auth_org_ids())
  )
  OR tenant_id = public.auth_tenant_id()
);

CREATE POLICY "lease_insert" ON leases FOR INSERT WITH CHECK (
  property_id IN (
    SELECT id FROM properties WHERE org_id IN (SELECT public.auth_org_ids())
  )
);

CREATE POLICY "lease_update" ON leases FOR UPDATE USING (
  property_id IN (
    SELECT id FROM properties WHERE org_id IN (SELECT public.auth_org_ids())
  )
);

CREATE POLICY "lease_delete" ON leases FOR DELETE USING (
  property_id IN (
    SELECT id FROM properties WHERE org_id IN (SELECT public.auth_org_admin_ids())
  )
);


-- 8. PAYMENTS — via lease_id -> property_id (pas de colonne org_id sur payments)
-- ===============================================================================
DROP POLICY IF EXISTS "Users can view payments for their leases" ON payments;
DROP POLICY IF EXISTS "Users can insert payments for their leases" ON payments;
DROP POLICY IF EXISTS "Users can update payments for their leases" ON payments;
DROP POLICY IF EXISTS "Users can delete payments for their leases" ON payments;
DROP POLICY IF EXISTS "tenant views own payments" ON payments;
DROP POLICY IF EXISTS "payment_select" ON payments;
DROP POLICY IF EXISTS "payment_insert" ON payments;
DROP POLICY IF EXISTS "payment_update" ON payments;
DROP POLICY IF EXISTS "payment_delete" ON payments;

CREATE POLICY "payment_select" ON payments FOR SELECT USING (
  lease_id IN (
    SELECT l.id FROM leases l
    WHERE l.property_id IN (
      SELECT id FROM properties WHERE org_id IN (SELECT public.auth_org_ids())
    )
  )
  OR lease_id IN (SELECT public.auth_tenant_lease_ids())
);

CREATE POLICY "payment_insert" ON payments FOR INSERT WITH CHECK (
  lease_id IN (
    SELECT l.id FROM leases l
    WHERE l.property_id IN (
      SELECT id FROM properties WHERE org_id IN (SELECT public.auth_org_ids())
    )
  )
);

CREATE POLICY "payment_update" ON payments FOR UPDATE USING (
  lease_id IN (
    SELECT l.id FROM leases l
    WHERE l.property_id IN (
      SELECT id FROM properties WHERE org_id IN (SELECT public.auth_org_ids())
    )
  )
);

CREATE POLICY "payment_delete" ON payments FOR DELETE USING (
  lease_id IN (
    SELECT l.id FROM leases l
    WHERE l.property_id IN (
      SELECT id FROM properties WHERE org_id IN (SELECT public.auth_org_admin_ids())
    )
  )
);


-- 9. ISSUES — via org_id (la table issues a bien une colonne org_id)
-- ==================================================================
DROP POLICY IF EXISTS "org members view issues" ON issues;
DROP POLICY IF EXISTS "org members update issues" ON issues;
DROP POLICY IF EXISTS "tenant views own issues" ON issues;
DROP POLICY IF EXISTS "tenant creates own issues" ON issues;
DROP POLICY IF EXISTS "issue_select" ON issues;
DROP POLICY IF EXISTS "issue_insert" ON issues;
DROP POLICY IF EXISTS "issue_update" ON issues;

CREATE POLICY "issue_select" ON issues FOR SELECT USING (
  org_id IN (SELECT public.auth_org_ids())
  OR tenant_id = public.auth_tenant_id()
);

CREATE POLICY "issue_insert" ON issues FOR INSERT WITH CHECK (
  org_id IN (SELECT public.auth_org_ids())
  OR tenant_id = public.auth_tenant_id()
);

CREATE POLICY "issue_update" ON issues FOR UPDATE USING (
  org_id IN (SELECT public.auth_org_ids())
);


-- 10. TRIGGER handle_new_user — robuste pour les invitations (sans metadata)
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, phone, address)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    first_name = CASE WHEN EXCLUDED.first_name <> '' THEN EXCLUDED.first_name ELSE profiles.first_name END,
    last_name  = CASE WHEN EXCLUDED.last_name  <> '' THEN EXCLUDED.last_name  ELSE profiles.last_name  END,
    phone      = CASE WHEN EXCLUDED.phone      <> '' THEN EXCLUDED.phone      ELSE profiles.phone      END,
    address    = CASE WHEN EXCLUDED.address    <> '' THEN EXCLUDED.address    ELSE profiles.address    END;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
