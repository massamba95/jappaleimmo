# 04 — Base de données

La base est PostgreSQL hébergé par Supabase. Ce document liste **toutes les tables**, leurs colonnes importantes, leurs relations, et les policies RLS qui gouvernent qui peut lire/modifier quoi.

---

## Accès à la DB

**Interface web** : <https://supabase.com> → projet Jappalé Immo → **SQL Editor** pour écrire du SQL manuel, **Table Editor** pour voir/modifier des lignes en mode tableur.

**Depuis le code** : jamais de SQL direct, mais via le client Supabase :
```ts
const { data, error } = await supabase
  .from("properties")
  .select("*")
  .eq("org_id", orgId);
```
Le client traduit en requête SQL et l'envoie à Supabase via HTTPS.

💡 **Ce qui n'est PAS possible** : ouvrir un psql sur Supabase en prod avec un simple `psql` en CLI, sauf en payant le plan supérieur avec "Direct connection". En pratique on utilise toujours le SQL Editor de la UI.

---

## Vue d'ensemble des tables

```
                    ┌─────────────────────┐
                    │    organizations    │ ← 1 ligne = 1 agence
                    │   (tenant racine)   │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │ memberships  │   │  properties  │   │ subscriptions│
    │ (users ↔ org)│   │    (biens)   │   │  (abo + plan) │
    └──────┬───────┘   └──────┬───────┘   └──────────────┘
           │                  │
           ▼                  │
    ┌──────────────┐          │
    │auth.users    │          │
    │(Supabase Auth│          │
    │  — gérée     │          │
    │  par         │          │
    │  Supabase)   │          │
    └──────┬───────┘          │
           │                  │
           ▼ (1-1)            │
    ┌──────────────┐          │
    │  profiles    │          │
    │(données publ)│          │
    └──────────────┘          │
                              │
                    ┌─────────┴────────┐
                    │                  │
                    ▼                  ▼
             ┌──────────────┐   ┌──────────────┐
             │    leases    │   │    owners    │
             │ (baux : 1 per│   │(propriétaires│
             │  locataire + │   │  tiers)      │
             │  1 property) │   └──────────────┘
             └──────┬───────┘
                    │
            ┌───────┼───────────┐
            ▼               ▼
    ┌──────────────┐   ┌──────────────┐
    │    tenants   │   │   payments   │
    │ (locataires) │   │ (par bail +  │
    │ user_id lien │   │  mois)       │
    │ vers auth    │   └──────────────┘
    └──────────────┘

    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
    │    issues    │     │    visits    │     │ super_admins │
    │(signalements │     │ (demandes    │     │   (user_id)  │
    │  locataires) │     │  publiques)  │     │              │
    └──────────────┘     └──────────────┘     └──────────────┘
```

---

## Tables en détail

### `organizations` — une agence / un propriétaire

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | Identifiant unique |
| `name` | text | Nom de l'agence |
| `slug` | text (unique) | Utilisé dans l'URL publique `/agences/<slug>` |
| `plan` | enum | `FREE`, `PRO`, `AGENCY`, `ENTERPRISE` |
| `status` | enum | `ACTIVE`, `TRIAL`, `BLOCKED`, `CANCELLED` |
| `max_properties` | int | Limite de biens selon le plan |
| `max_members` | int | Limite d'utilisateurs selon le plan |
| `trial_ends_at` | timestamp | Fin de la période d'essai |
| `created_at` | timestamp | Date de création |

### `memberships` — lien user ↔ org

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `org_id` | UUID (FK) | → organizations |
| `user_id` | UUID (FK) | → auth.users |
| `role` | enum | `ADMIN`, `MANAGER`, `AGENT`, `ACCOUNTANT`, `SECRETARY` |
| `status` | enum | `ACTIVE`, `PENDING` |
| `created_at` | timestamp | |

Un utilisateur peut être membre de plusieurs orgs (rare, mais possible). Une org a au minimum un `ADMIN`.

### `profiles` — infos publiques utilisateur

Table créée automatiquement par trigger quand un user s'inscrit dans `auth.users`.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | = auth.users.id |
| `email` | text | |
| `first_name`, `last_name` | text | |
| `phone`, `address` | text | Infos de contact |
| `created_at` | timestamp | |

### `subscriptions` — abonnements payants

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `org_id` | UUID (FK) | → organizations |
| `plan` | enum | Plan souscrit |
| `amount` | int | Montant en FCFA |
| `status` | enum | `ACTIVE`, `PAST_DUE`, `CANCELLED`, `PENDING_VALIDATION` |
| `payment_method` | enum | `WAVE`, `ORANGE_MONEY` |
| `current_period_start`, `current_period_end` | timestamp | Période couverte |

### `properties` — les biens immobiliers

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `org_id` | UUID (FK) | → organizations |
| `title` | text | Nom du bien |
| `type` | enum | `APARTMENT`, `HOUSE`, `COMMERCIAL`, `LAND` |
| `address`, `city` | text | |
| `rooms`, `area` | int | Nb pièces, surface m² |
| `rent_amount`, `charges` | int | En FCFA |
| `status` | enum | `AVAILABLE`, `OCCUPIED`, `MAINTENANCE`, `SOLD` |
| `photos` | text[] | URLs dans le bucket `property-photos` |
| `listing_type` | enum | `RENT`, `SALE`, `BOTH` |
| `sale_price` | int | Prix de vente si applicable |
| `owner_id` | UUID (FK) | → owners (nullable) |
| `created_at` | timestamp | |

### `tenants` — les locataires

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `org_id` | UUID (FK) | → organizations |
| `user_id` | UUID (FK, nullable) | → auth.users (lié quand le locataire accepte son invitation) |
| `first_name`, `last_name` | text | |
| `phone`, `email`, `cni` | text | |
| `invited_at` | timestamp | Date d'envoi de l'invitation |
| `created_at` | timestamp | |

⚠️ **Important** : `user_id` est nullable. Il est rempli quand le locataire accepte son invitation par email. Voir [05-authentication.md](05-authentication.md).

### `leases` — les baux

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `property_id` | UUID (FK) | → properties |
| `tenant_id` | UUID (FK) | → tenants |
| `start_date`, `end_date` | date | |
| `rent_amount`, `deposit` | int | Loyer + caution en FCFA |
| `status` | enum | `ACTIVE`, `EXPIRED`, `TERMINATED` |
| `created_at` | timestamp | |

### `payments` — les paiements de loyer

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `lease_id` | UUID (FK) | → leases |
| `amount` | int | Montant dû en FCFA |
| `due_date` | date | Date d'échéance |
| `paid_date` | date (nullable) | Date de paiement effectif |
| `method` | enum | `CASH`, `TRANSFER`, `WAVE`, `ORANGE_MONEY` |
| `status` | enum | `PENDING`, `LATE`, `PARTIAL`, `PAID` |
| `receipt_url` | text | URL de la quittance PDF générée |
| `created_at` | timestamp | |

### `owners` — propriétaires tiers (agences qui gèrent pour d'autres)

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `org_id` | UUID (FK) | |
| `first_name`, `last_name`, `phone`, `email`, `notes` | text | |

### `issues` — signalements locataires

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `org_id`, `tenant_id`, `property_id`, `lease_id` | UUID (FK) | |
| `title`, `description` | text | |
| `category` | enum | `PLUMBING`, `ELECTRICITY`, `APPLIANCE`, `HEATING`, `STRUCTURE`, `OTHER` |
| `status` | enum | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `photos` | text[] | URLs dans bucket `issue-photos` |
| `created_at`, `resolved_at` | timestamp | |

### `visits` — demandes de visite publiques

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | |
| `property_id`, `org_id` | UUID (FK) | |
| `visitor_name`, `visitor_phone`, `visitor_email` | text | |
| `requested_date`, `requested_time` | date / time | |
| `message` | text | |
| `status` | enum | `PENDING`, `CONFIRMED`, `CANCELLED`, `DONE` |

### `super_admins` — qui a accès au panel super-admin

Mini-table : une seule colonne `user_id` (PK) = UUID de auth.users. Simple, efficace.

---

## Row Level Security (RLS)

### C'est quoi

**RLS = Row Level Security**. Une fonctionnalité native de PostgreSQL qui permet de définir, sur chaque table, des règles SQL qui filtrent automatiquement les lignes selon qui pose la question.

Exemple sur la table `properties` :
```sql
CREATE POLICY prop_select ON properties
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );
```

Traduction : quand quelqu'un fait `SELECT * FROM properties`, Postgres ajoute automatiquement `WHERE org_id IN (...)`. Si l'utilisateur n'est membre d'aucune org, il obtient 0 ligne.

💡 **Avantage** : même si un bug applicatif oublie un filtre, Postgres ne laissera jamais passer de données croisées entre orgs.

### Liste des policies principales

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| organizations | Membre OR super_admin | Public (signup) | ADMIN | — |
| memberships | Même org | Public | Même org | Même org |
| subscriptions | ADMIN OR super_admin | Public | — | — |
| properties | Membre org | Membre org | Membre org | ADMIN/MANAGER |
| tenants | Membre org | Membre org | Membre org | Membre org |
| leases | Via property.org_id | Idem | Idem | Idem |
| payments | Via property.org_id | Idem | Idem | Idem |
| owners | Via org_id | Idem | Idem | ADMIN/MANAGER |
| issues | Membre org OR tenant self | Membre OR tenant (self) | Membre | Membre |
| visits | Membre org | **Public** (formulaire) | Membre | Membre |
| profiles | Self OR org members | Public | Self | — |
| super_admins | RLS désactivé | — | — | — |

### Cas particulier : éviter la récursion RLS

⚠️ **Piège connu** : si une policy sur la table A fait un `SELECT` sur la table B, et que la policy sur B fait aussi un `SELECT` sur A, PostgreSQL entre en récursion infinie.

**Solution appliquée** : des fonctions `SECURITY DEFINER` qui court-circuitent RLS. Voir plus bas.

---

## Fonctions SQL (triggers + helpers)

### Triggers sur auth.users

#### `handle_new_user()` — après inscription

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

Crée automatiquement un `profiles` à chaque nouveau signup.

#### `handle_user_update()` — après modification

```sql
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_update();
```

Synchronise `profiles.email` avec `auth.users.email` si l'user change son email.

⚠️ **Piège historique** : ne jamais ajouter de `AFTER UPDATE` trigger complexe sur `auth.users`. Supabase gère cette table avec des contraintes internes, et tout trigger buggé bloque **toute l'authentification** (login, signup, reset password). C'est arrivé. Memory : `feedback_auth_triggers.md`.

### Triggers d'enforcement des limites

#### `enforce_property_limit()` — BEFORE INSERT sur properties

Empêche d'insérer un bien si l'org a déjà atteint `max_properties` de son plan. Lève une erreur SQL visible côté app.

#### `enforce_membership_limit()` — BEFORE INSERT/UPDATE sur memberships

Empêche d'ajouter un membre ACTIVE au-delà de `max_members`. Les memberships `PENDING` ne comptent pas.

### Fonctions pour le portail locataire (SECURITY DEFINER)

#### `auth_tenant_id()`

Retourne le `tenant_id` lié au `auth.uid()` courant. Utilisée dans les policies des tables `leases`, `payments`, `properties` côté portail locataire.

#### `auth_tenant_property_ids()` et `auth_tenant_lease_ids()`

Même principe : retournent la liste des `property_id` ou `lease_id` visibles par le locataire connecté.

💡 **Pourquoi `SECURITY DEFINER`** : la fonction s'exécute avec les droits du créateur (postgres super-user) au lieu des droits de l'appelant. Elle peut donc lire `memberships` et `tenants` sans déclencher leurs propres RLS, cassant la récursion.

---

## Migrations : comment appliquer un changement de schéma

### En dev (sur ton projet Supabase perso)

1. Ouvrir <https://supabase.com> → projet → **SQL Editor**
2. Coller le contenu du nouveau fichier `.sql`
3. Cliquer **Run**
4. Vérifier qu'aucune erreur ne remonte

### En prod

Même processus, sur le projet Supabase de prod. **Toujours sauvegarder la DB avant** (Settings → Database → Backups).

### Ajouter une nouvelle migration

1. Créer un fichier `supabase/migration_<date>_<nom>.sql`
2. Écrire le SQL `CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY`, etc.
3. Tester en dev
4. Appliquer en prod
5. Mettre à jour [CHANGELOG.md](../CHANGELOG.md)

---

## Sauvegardes

Supabase fait des backups automatiques quotidiens sur le plan gratuit (conservés 7 jours). Pour des backups plus longs ou manuels : **Settings → Database → Backups → Create backup**.

On peut aussi exporter un dump SQL complet via : **Database → Replication → Full dump**.

---

## Prochaine lecture

→ [05-authentication.md](05-authentication.md) : sessions, rôles, portail locataire.
