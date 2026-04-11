-- JappaleImmo - Schema de base de donnees Supabase
-- A executer dans le SQL Editor de Supabase

-- ============================================================
-- TABLES
-- ============================================================

-- Biens immobiliers
CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('APARTMENT', 'HOUSE', 'COMMERCIAL', 'LAND')),
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Dakar',
  rooms INTEGER,
  area REAL,
  rent_amount INTEGER NOT NULL,
  charges INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE')),
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Locataires
CREATE TABLE tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  cni TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Baux (contrats de location)
CREATE TABLE leases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  rent_amount INTEGER NOT NULL,
  deposit INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'TERMINATED')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Paiements
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  method TEXT NOT NULL CHECK (method IN ('CASH', 'TRANSFER', 'WAVE', 'ORANGE_MONEY')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PAID', 'LATE', 'PARTIAL', 'PENDING')),
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- INDEX
-- ============================================================

CREATE INDEX idx_properties_user_id ON properties(user_id);
CREATE INDEX idx_tenants_user_id ON tenants(user_id);
CREATE INDEX idx_leases_property_id ON leases(property_id);
CREATE INDEX idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX idx_payments_lease_id ON payments(lease_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Properties: users can only see/manage their own
CREATE POLICY "Users can view their own properties"
  ON properties FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own properties"
  ON properties FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties"
  ON properties FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties"
  ON properties FOR DELETE USING (auth.uid() = user_id);

-- Tenants: users can only see/manage their own
CREATE POLICY "Users can view their own tenants"
  ON tenants FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tenants"
  ON tenants FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tenants"
  ON tenants FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tenants"
  ON tenants FOR DELETE USING (auth.uid() = user_id);

-- Leases: users can manage leases for their own properties
CREATE POLICY "Users can view leases for their properties"
  ON leases FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties WHERE properties.id = leases.property_id AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert leases for their properties"
  ON leases FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties WHERE properties.id = leases.property_id AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update leases for their properties"
  ON leases FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM properties WHERE properties.id = leases.property_id AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete leases for their properties"
  ON leases FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM properties WHERE properties.id = leases.property_id AND properties.user_id = auth.uid()
    )
  );

-- Payments: users can manage payments for their leases
CREATE POLICY "Users can view payments for their leases"
  ON payments FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leases
      JOIN properties ON properties.id = leases.property_id
      WHERE leases.id = payments.lease_id AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments for their leases"
  ON payments FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leases
      JOIN properties ON properties.id = leases.property_id
      WHERE leases.id = payments.lease_id AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payments for their leases"
  ON payments FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM leases
      JOIN properties ON properties.id = leases.property_id
      WHERE leases.id = payments.lease_id AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payments for their leases"
  ON payments FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM leases
      JOIN properties ON properties.id = leases.property_id
      WHERE leases.id = payments.lease_id AND properties.user_id = auth.uid()
    )
  );
