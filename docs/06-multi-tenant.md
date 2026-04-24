# 06 — Multi-tenant

Jappalé Immo est **multi-tenant** : une seule instance de l'application sert plusieurs clients (agences) qui ne doivent **jamais** voir les données les uns des autres.

---

## Le vocabulaire

- **Tenant** (en SaaS) = un client de l'application. Dans Jappalé Immo, un tenant = une **agence** = une ligne de la table `organizations`.
- ⚠️ Ne pas confondre avec **tenant** au sens immobilier (= locataire) qui est la table `tenants`. Deux mots anglais homonymes dans le même projet.

Dans le reste de cette doc :
- **« org »** ou **« organisation »** = le tenant SaaS (l'agence)
- **« locataire »** = le tenant immobilier (celui qui paye un loyer)

---

## Principe d'isolation

Tout se résume à ce diagramme :

```
auth.users (la personne connectée)
    ↓ relié par user_id
memberships (liste des orgs dont elle est membre)
    ↓ org_id
organizations (les agences)
    ↓ tout le métier référence org_id
properties, tenants, leases, payments, owners, issues, visits...
```

Toutes les tables métier ont une colonne **`org_id`**. Les policies RLS ajoutent automatiquement le filtre `WHERE org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid())` à chaque requête SQL.

---

## Un exemple concret

Trois agences sur Jappalé Immo :

| org | nom | membres |
|-----|-----|---------|
| A | Agence Sicap | Massamba (ADMIN), Aïssatou (AGENT) |
| B | Immo Ngor | Moussa (ADMIN) |
| C | Pro Dakar | Fatou (ADMIN), Ibrahima (MANAGER), Aminata (SECRETARY) |

Quand **Aïssatou** (agence A) se connecte et fait `SELECT * FROM properties` :
- Le JWT dit `auth.uid() = Aïssatou`
- RLS traduit en : `WHERE org_id IN (org_A)` (Aïssatou n'est membre que de A)
- Elle ne voit **que les biens de Sicap**

Si **Moussa** (agence B) essaie de modifier un bien de l'agence A en trafiquant l'UI :
- Sa requête arrive : `UPDATE properties SET rent = 1 WHERE id = '<bien de A>'`
- La policy `prop_update` vérifie : `org_id IN (SELECT org_id FROM memberships WHERE user_id = Moussa)`
- Le bien A n'en fait pas partie → **0 ligne affectée**, rien n'est modifié

L'isolation est garantie au niveau **base de données**, pas seulement applicatif.

---

## Obtenir l'org courante dans le code

### Côté client (hooks React)

```ts
import { useOrg } from "@/lib/hooks/use-org";

function MyComponent() {
  const { orgId, orgName, orgPlan, role, membershipStatus, userId } = useOrg();
  // ...
}
```

`useOrg()` récupère la **première org ACTIVE** dont l'utilisateur est membre. Si l'utilisateur est dans plusieurs orgs (rare), c'est la plus récente.

### Côté serveur (Server Components / API routes)

```ts
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");

const { data: membership } = await supabase
  .from("memberships")
  .select("org_id, role")
  .eq("user_id", user.id)
  .eq("status", "ACTIVE")
  .single();

if (!membership) redirect("/login");
const orgId = membership.org_id;
```

---

## Cas du portail locataire

Le portail locataire (`/locataire/*`) a une contrainte particulière : le locataire **n'est pas membre d'une org**. Il est relié à une ligne de `tenants` via `tenants.user_id = auth.uid()`.

Les RLS classiques (basées sur `memberships`) ne marchent pas pour lui. Solution : des fonctions `SECURITY DEFINER` :

```sql
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT id FROM tenants WHERE user_id = auth.uid() LIMIT 1
$$;
```

Ensuite la policy `leases_select_tenant` ressemble à :
```sql
CREATE POLICY leases_select_tenant ON leases
  FOR SELECT USING (
    tenant_id = auth_tenant_id()
  );
```

`SECURITY DEFINER` = la fonction s'exécute avec les droits du super-user Postgres. Elle peut lire `tenants` sans déclencher la policy RLS de `tenants` (ce qui éviterait une récursion infinie). Le locataire obtient donc ses propres baux, et rien d'autre.

💡 **Référence memory** : `feedback_rls_recursion.md` — chaque fois qu'une policy a besoin de faire un JOIN / sous-requête sur une table RLS, utiliser une fonction `SECURITY DEFINER`.

---

## Enforcement des limites de plan

Chaque plan a une limite :

| Plan | `max_properties` | `max_members` |
|------|------------------|---------------|
| FREE | 1 | 1 |
| PRO | 3 | 3 |
| AGENCY | 15 | 10 |
| ENTERPRISE | illimité | illimité |

Ces limites sont **enforcées au niveau DB** via des triggers :

### `enforce_property_limit()` — BEFORE INSERT on properties

```sql
IF (
  (SELECT COUNT(*) FROM properties WHERE org_id = NEW.org_id)
  >= (SELECT max_properties FROM organizations WHERE id = NEW.org_id)
) THEN
  RAISE EXCEPTION 'Limite de biens atteinte pour ce plan';
END IF;
```

Si un ADMIN tente de créer un 4e bien sur un plan PRO → erreur SQL → message d'erreur dans l'UI → pas d'insertion.

### `enforce_membership_limit()` — BEFORE INSERT/UPDATE on memberships

Même logique, sauf qu'on ne compte que les memberships `ACTIVE` (pas les `PENDING`).

**Pourquoi des triggers DB et pas juste du code applicatif ?** Parce qu'un bug côté app (ou un admin qui contourne l'UI avec un outil externe) ne peut pas dépasser la limite. Double sécurité.

---

## Comment passer un client d'un plan à un autre

### Workflow normal (via l'app)
1. L'ADMIN de l'org clique sur `/dashboard/upgrade`
2. Choisit le plan, paie via Wave/OM, entre le numéro de transaction
3. POST `/api/subscriptions/request` → crée une subscription `PENDING_VALIDATION`
4. Le super-admin reçoit la demande dans son dashboard
5. Il valide manuellement (vérifie Wave/OM → marque la subscription `ACTIVE`)
6. Le code met à jour `organizations.plan` et `max_properties` / `max_members`

### En cas d'urgence (manuel)
SQL direct dans Supabase :
```sql
UPDATE organizations
SET plan = 'AGENCY',
    max_properties = 15,
    max_members = 10,
    status = 'ACTIVE'
WHERE id = '<UUID>';
```

Voir [12-operations.md](12-operations.md) pour le runbook complet.

---

## Expiration d'un abonnement

Cron `/api/cron/expire-subscriptions` (tous les jours à 01h UTC) :

```
1. SELECT subscriptions WHERE status='ACTIVE' AND current_period_end < now()
2. Pour chacune :
   - UPDATE subscriptions SET status='PAST_DUE'
   - UPDATE organizations SET plan='FREE', max_properties=1, max_members=1
```

L'org est rétrogradée en plan FREE. Les biens/membres au-delà de la nouvelle limite **ne sont pas supprimés**, mais toute création nouvelle est bloquée par les triggers tant que l'org n'a pas repayé.

Le composant `subscription-alert.tsx` affiche une alerte dès que l'abonnement est à moins de 7 jours de la fin. Le composant `subscription-expired-wall.tsx` bloque le dashboard après expiration.

---

## Multi-org pour un même utilisateur

Un user peut techniquement être membre de plusieurs orgs. Cas de figure :
- Un développeur qui travaille pour 2 agences
- Un super-admin qui est aussi admin d'une agence de test

Dans ce cas, `useOrg()` retourne la **première org active** (ordre non garanti, en pratique la plus récente). L'app **ne propose pas encore** de sélecteur d'org pour basculer facilement.

⚠️ **À prévoir** si un jour ce cas devient courant : ajouter un dropdown de sélection d'org dans le header du dashboard.

---

## Mini-sites publics par agence

Chaque org a un `slug` (ex: `sicap-immo`). Son mini-site est accessible à `/agences/sicap-immo`. Ce site est **public** (pas d'auth) et affiche :
- Les biens `AVAILABLE` de l'org
- Un formulaire de demande de visite

Côté RLS, ces données sont lues via la clé anon (pas de session). La policy `prop_select_public` autorise la lecture des biens `AVAILABLE` sans auth. Le formulaire de visite appelle `/api/public/visits` qui fait un INSERT via le client admin (pour bypass RLS sur INSERT).

---

## Prochaine lecture

→ [07-api-routes.md](07-api-routes.md) : détail de toutes les routes API.
