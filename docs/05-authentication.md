# 05 — Authentification

Ce document décrit comment les utilisateurs se connectent, ce qui se passe côté code, et comment la session est maintenue.

---

## Qui s'authentifie ?

Trois types d'utilisateurs, tous stockés dans `auth.users` (table Supabase Auth) :

1. **Membres d'une organisation** (ADMIN, MANAGER, AGENT, ACCOUNTANT, SECRETARY)
   → accèdent à `/dashboard/*`
2. **Locataires**
   → accèdent à `/locataire/*`
3. **Super-admin** (toi uniquement)
   → accès à `/super-admin/*`

Un même email ne peut pas être à la fois agence et locataire (une seule entrée `auth.users` par email).

---

## Fournisseur : Supabase Auth

**Rôle** : gère `auth.users`, génère des JWT (JSON Web Token), valide les mots de passe, envoie les emails de reset/signup.

**Méthodes activées** :
- Email + mot de passe (login classique)
- Magic Link (clic sur un lien reçu par email → connecté direct)
- Reset password (lien reçu par email → choisit un nouveau mot de passe)

---

## Le parcours d'inscription (agence)

```
1. Utilisateur remplit /register
2. Form submit → supabase.auth.signUp({ email, password })
3. Supabase crée auth.users[X]
4. Trigger handle_new_user() crée profiles[X]
5. Dans le code register :
   - INSERT INTO organizations (name, plan=FREE, status=TRIAL)
   - INSERT INTO memberships (org_id, user_id, role=ADMIN, status=ACTIVE)
6. Utilisateur connecté → redirection /dashboard
```

L'utilisateur est **immédiatement connecté** et dans son dashboard.

---

## Le parcours d'inscription (locataire)

```
1. Un ADMIN/MANAGER clique "Inviter" sur la fiche d'un locataire
   → /dashboard/tenants/[id] → bouton "Inviter"
2. POST /api/dashboard/tenants/[id]/invite
3. La route appelle supabase.auth.admin.inviteUserByEmail(email)
   (client admin, bypass permissions)
4. Supabase envoie un email avec un Magic Link
5. Locataire clique → atterrit sur /locataire/bienvenue
   avec une session active
6. Le code met à jour tenants.user_id pour relier la fiche
7. Redirection vers /locataire (son espace)
```

⚠️ **Subtilité** : la colonne `tenants.user_id` est mise à jour au premier chargement de l'espace locataire (via `/api/locataire/init`). La route vérifie :
- que le `user_id` n'est pas déjà lié ailleurs
- que l'email correspond
- que la fiche `tenants` n'est pas déjà associée à un autre `user_id`

Ceci est pour éviter une fuite cross-tenant déjà corrigée (voir [CHANGELOG](../CHANGELOG.md) v0.4.x).

---

## Comment la session est maintenue

Une fois connecté, Supabase pose **2 cookies HTTP-only** :
- `sb-<project>-auth-token` : le JWT (valable ~1h)
- `sb-<project>-auth-token.0`, `.1`, etc. : si le JWT est trop long pour un seul cookie

Ces cookies sont envoyés automatiquement à chaque requête vers le domaine. Le client Supabase les lit pour :
- Attacher le JWT au header `Authorization` des requêtes vers Supabase
- Renouveler automatiquement le JWT quand il expire (via refresh token)

💡 **HTTP-only** : le JavaScript du navigateur ne peut pas lire ces cookies. Cela empêche le vol de session via XSS.

---

## Côté code : les 3 clients Supabase

`src/lib/supabase/` contient 3 clients selon le contexte :

### `server.ts` — dans les Server Components et routes API

```ts
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

Utilise les cookies HTTP de la requête pour identifier l'utilisateur. Les requêtes respectent RLS.

### `client.ts` — dans les Client Components

```ts
"use client";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
```

Même chose mais exécuté dans le navigateur. Utilise le cookie automatique.

### `admin.ts` — dans les routes API qui ont besoin de bypass RLS

```ts
import { createAdminClient } from "@/lib/supabase/admin";

const supabase = createAdminClient();
// Cette requête ignore toutes les policies RLS
```

**À utiliser uniquement** dans :
- Les crons (`/api/cron/*`)
- Les routes super-admin (`/api/admin/*`)
- Les cas très spécifiques où RLS gêne (ex: invitation de locataire)

⚠️ **Ne jamais exposer** : la `SERVICE_ROLE_KEY` ne doit jamais arriver dans le navigateur. Si tu vois un `createAdminClient()` dans un Client Component, c'est une faille grave.

---

## Les rôles : qui a le droit de faire quoi

Définition dans `src/lib/permissions.ts`.

| Rôle | Lecture | Création | Modif | Suppression | Team mgmt | Paramètres org |
|------|---------|----------|-------|-------------|-----------|----------------|
| **ADMIN** | Tout | Tout | Tout | Tout | ✅ | ✅ |
| **MANAGER** | Tout | Tout | Tout | Tout | ❌ | ❌ |
| **AGENT** | Tout | Tout | Tout | ❌ | ❌ | ❌ |
| **ACCOUNTANT** | Tout | Paiements | Paiements | ❌ | ❌ | ❌ |
| **SECRETARY** | Lecture seule | ❌ | ❌ | ❌ | ❌ | ❌ |

Ces rôles sont stockés dans `memberships.role`. Le contrôle se fait **à 2 niveaux** :
- **UI** : les boutons sont cachés selon le rôle (`src/lib/permissions.ts` + `useOrg()` hook)
- **DB** : les policies RLS refusent les actions interdites même si on contourne l'UI

---

## Les statuts de membership

Colonne `memberships.status` :

| Statut | Signification |
|--------|---------------|
| `ACTIVE` | Accès complet à l'org |
| `PENDING` | Invitation envoyée mais pas acceptée (ou compte pas encore activé) |

Quand un admin invite un membre, sa ligne est créée en `PENDING`. Le code (composant `pending-approval.tsx`) affiche un écran d'attente tant que le statut reste `PENDING`.

Le trigger `enforce_membership_limit` **ne compte que les ACTIVE** pour vérifier la limite du plan.

---

## Super-admin

**Accès** : la page `/super-admin/*` vérifie dans son layout que `auth.uid()` est dans la table `super_admins`.

**Ajouter un super-admin** :
```sql
INSERT INTO super_admins (user_id)
VALUES ('<UUID de auth.users>');
```

(Voir `supabase/super_admin_setup.sql`.)

Le super-admin peut :
- Voir toutes les organisations
- Modifier leur plan, leur statut
- Voir et valider les demandes d'abonnement (`subscription_status = PENDING_VALIDATION`)
- Consulter les stats globales (revenu, orgs actives, etc.)

Il **ne peut pas**, par design :
- Voir les données métier d'une org (properties, tenants…) sans être explicitement membre

---

## Reset password

### Côté utilisateur
1. Clic "Mot de passe oublié" sur `/login`
2. Entre son email sur `/forgot-password`
3. Le code appelle `POST /api/auth/request-reset`
4. La route utilise `supabase.auth.admin.generateLink({ type: 'recovery', email })`
5. Récupère le lien signé, l'envoie via Resend dans un email HTML personnalisé
6. User clique le lien → arrive sur `/reset-password`
7. Entre son nouveau mot de passe → `supabase.auth.updateUser({ password })`

💡 **Pourquoi ne pas laisser Supabase envoyer le mail ?** Le mail par défaut de Supabase est générique et dit « noreply@supabase.io ». On préfère un email aux couleurs de Jappalé Immo envoyé depuis `noreply@jappaleimmo.com` via Resend.

---

## Déconnexion

Côté code :
```ts
await supabase.auth.signOut();
router.push("/login");
```

Supabase invalide le JWT et supprime les cookies.

---

## Ce qui n'est PAS implémenté (à savoir)

- ❌ **2FA** (authentification à deux facteurs) — pas d'OTP ni d'app authenticator
- ❌ **Login Google/Facebook/GitHub** — seulement email/password
- ❌ **SSO entreprise** (SAML, OIDC)
- ❌ **Audit trail des logins** — on ne log pas qui se connecte quand (Supabase le fait lui-même dans ses logs internes mais pas dans l'app)
- ❌ **Blocage après X tentatives ratées** — Supabase a un rate limit par défaut mais pas de verrouillage visible

Si un jour ces besoins apparaissent, ils se configurent dans Supabase Auth (pas besoin de réécrire du code).

---

## Prochaine lecture

→ [06-multi-tenant.md](06-multi-tenant.md) : comment les agences sont isolées.
