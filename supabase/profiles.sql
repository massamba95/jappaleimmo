-- Table profiles pour stocker les infos publiques des utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by org members"
  ON profiles FOR SELECT USING (
    id IN (
      SELECT m2.user_id FROM memberships m2
      WHERE m2.org_id IN (SELECT m.org_id FROM memberships m WHERE m.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Profiles can be inserted"
  ON profiles FOR INSERT WITH CHECK (true);

-- Trigger : creer automatiquement un profil quand un user s'inscrit
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Inserer les profils pour les utilisateurs existants
INSERT INTO profiles (id, email, first_name, last_name)
SELECT id, email, raw_user_meta_data->>'first_name', raw_user_meta_data->>'last_name'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
