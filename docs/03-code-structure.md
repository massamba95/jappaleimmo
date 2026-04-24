# 03 — Organisation du code

Ce document décrit **où se trouve quoi** dans le projet. Quand tu veux modifier une partie de l'app, commence par retrouver le bon fichier ici.

---

## Structure racine

```
dakaimmo/
├── src/                      ← Tout le code source de l'application
├── supabase/                 ← Migrations SQL
├── public/                   ← Assets statiques servis tels quels
├── scripts/                  ← Scripts Node.js utilitaires (Playwright)
├── docs/                     ← Cette documentation technique
├── package.json              ← Dépendances npm + version + scripts
├── tsconfig.json             ← Config TypeScript
├── next.config.ts            ← Config Next.js (minimale)
├── vercel.json               ← Config Vercel (crons uniquement)
├── postcss.config.mjs        ← Config Tailwind CSS v4
├── .env.local                ← Secrets locaux (non commité)
├── .env.local.example        ← Template des variables d'env
├── README.md                 ← Point d'entrée du repo
├── CHANGELOG.md              ← Historique des versions
├── AGENTS.md / CLAUDE.md     ← Instructions pour les IA
└── ARCHITECTURE_MULTI_TENANT.md  ← Ancien doc (à terme à migrer dans docs/)
```

---

## `src/app/` — les pages et les routes API

C'est le cœur de l'application. Next.js App Router : **chaque dossier = une URL**.

### Groupes de routes (dossiers entre parenthèses)

Un dossier comme `(dashboard)` ou `(legal)` est **invisible dans l'URL**. Il sert uniquement à partager un layout commun entre plusieurs pages. Exemples :

| Dossier | URL résultante | Utilité |
|---------|----------------|---------|
| `src/app/(auth)/login/page.tsx` | `/login` | Groupe les pages d'auth (login, register, forgot-password, reset-password) |
| `src/app/(dashboard)/dashboard/properties/page.tsx` | `/dashboard/properties` | Groupe les pages du dashboard sous un layout commun |
| `src/app/(docs)/aide/biens/page.tsx` | `/aide/biens` | Doc utilisateur avec sa propre sidebar |
| `src/app/(legal)/cgu/page.tsx` | `/cgu` | Pages légales avec un layout neutre |

### Arborescence complète

```
src/app/
├── layout.tsx                      ← Layout racine (providers globaux)
├── page.tsx                        ← Homepage (landing)
├── globals.css                     ← Styles Tailwind + thème
├── favicon.ico
│
├── (auth)/                         ← Connexion / inscription / reset
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
│
├── (dashboard)/dashboard/          ← Espace agence (réservé org members)
│   ├── layout.tsx                  ← Sidebar + header + guard auth
│   ├── page.tsx                    ← Tableau de bord (KPIs)
│   ├── properties/
│   │   ├── page.tsx                ← Liste biens
│   │   ├── new/page.tsx            ← Créer un bien
│   │   └── [id]/
│   │       ├── page.tsx            ← Détail bien
│   │       └── edit/page.tsx       ← Éditer
│   ├── tenants/…                   ← (même pattern)
│   ├── leases/…
│   ├── payments/…
│   ├── owners/…
│   ├── signalements/page.tsx
│   ├── visits/page.tsx
│   ├── suivi/page.tsx
│   ├── activity/page.tsx
│   ├── team/page.tsx               ← Gestion équipe (invitations)
│   ├── settings/page.tsx           ← Paramètres org + profil
│   └── upgrade/page.tsx            ← Changement de plan (Wave/OM)
│
├── (docs)/aide/                    ← Documentation utilisateur
│   ├── layout.tsx                  ← Sidebar de la doc + boutons PDF
│   ├── page.tsx                    ← Intro
│   ├── demarrage/page.tsx
│   ├── biens/page.tsx
│   └── …                           ← 11 sections au total
│
├── (legal)/                        ← Pages légales (CGU, confidentialité)
│   ├── layout.tsx
│   ├── cgu/page.tsx
│   └── confidentialite/page.tsx
│
├── locataire/                      ← Portail locataire (utilisateurs locataires)
│   ├── layout.tsx                  ← Guard auth + récup tenant
│   ├── page.tsx                    ← Accueil portail
│   ├── bienvenue/page.tsx          ← Onboarding (lien d'invitation)
│   ├── contrat/page.tsx
│   ├── paiements/page.tsx
│   ├── documents/page.tsx
│   ├── profil/page.tsx
│   └── signaler/page.tsx
│
├── super-admin/                    ← Interface super-admin (toi)
│   ├── layout.tsx                  ← Guard super_admins table
│   ├── page.tsx                    ← Stats globales
│   ├── organisations/…
│   └── abonnements/…
│
├── agences/[slug]/                 ← Mini-site public de chaque agence
│   ├── page.tsx
│   └── biens-grid.tsx
│
├── plaquette/                      ← Brochure commerciale 6 pages
│   ├── layout.tsx
│   └── page.tsx
│
└── api/                            ← Backend : routes serveur
    ├── auth/
    │   ├── callback/route.ts       ← Callback OAuth Supabase
    │   └── request-reset/route.ts  ← Envoi email reset (Resend)
    ├── cron/
    │   ├── generate-payments/route.ts
    │   ├── send-reminders/route.ts
    │   ├── mark-late/route.ts
    │   └── expire-subscriptions/route.ts
    ├── admin/                      ← Routes super-admin
    │   ├── stats/route.ts
    │   ├── organisations/…
    │   └── subscriptions/…
    ├── dashboard/                  ← Routes agence
    │   ├── notifications/route.ts
    │   ├── issues/…
    │   ├── payments/[id]/send-quittance/route.ts
    │   ├── tenants/[id]/invite/route.ts
    │   ├── visits/…
    │   └── import/…
    ├── locataire/                  ← Routes portail locataire
    │   ├── init/route.ts
    │   ├── issues/route.ts
    │   └── notifications/route.ts
    ├── public/
    │   └── visits/route.ts         ← Formulaire public (sans auth)
    └── subscriptions/
        └── request/route.ts        ← Demande upgrade (Wave/OM)
```

Détail de chaque route API dans [07-api-routes.md](07-api-routes.md).

---

## `src/components/` — composants React réutilisables

```
src/components/
├── dashboard/                      ← Composants spécifiques au dashboard
│   ├── sidebar-nav.tsx             ← Navigation gauche
│   ├── mobile-nav.tsx              ← Menu burger mobile
│   ├── search-bar.tsx              ← Barre de recherche
│   ├── subscription-alert.tsx      ← Alerte fin d'abonnement
│   ├── subscription-expired-wall.tsx ← Mur bloquant si expiré
│   ├── pending-approval.tsx        ← Écran attente validation membership
│   ├── delete-button.tsx           ← Bouton suppression avec confirm
│   └── csv-import-dialog.tsx       ← Import CSV (biens, locataires)
│
├── docs/
│   └── doc-components.tsx          ← Screenshot/Callout/Step pour la doc
│
└── ui/                             ← Composants shadcn/ui (base)
    ├── badge.tsx
    ├── button.tsx
    ├── card.tsx
    ├── input.tsx
    ├── label.tsx
    ├── select.tsx
    ├── table.tsx
    ├── textarea.tsx
    └── sonner.tsx                  ← Toast notifications
```

💡 **Différence avec `src/app/`** : `src/app/` contient des **pages** (une URL). `src/components/` contient des **morceaux** de pages, importables partout.

---

## `src/lib/` — utilitaires et logique métier

```
src/lib/
├── supabase/
│   ├── server.ts                   ← Client Supabase côté serveur (SSR, cookies)
│   ├── client.ts                   ← Client Supabase côté navigateur
│   └── admin.ts                    ← Client Supabase bypass RLS (admin/crons)
├── hooks/
│   └── use-org.ts                  ← Récupère l'org courante côté client
├── pdf/
│   ├── quittance.ts                ← Génération PDF d'une quittance
│   └── rapport.ts                  ← Génération de rapports
├── permissions.ts                  ← Matrice rôles → permissions
├── plans.ts                        ← Plans (FREE/PRO/…) + limites + helpers
├── activity-log.ts                 ← Journalisation des actions
├── whatsapp.ts                     ← Génère messages / URLs WhatsApp
└── utils.ts                        ← Fonctions utilitaires (cn, formatDate…)
```

---

## `src/types/` — types TypeScript

```
src/types/
└── database.ts                     ← Interfaces des tables DB
                                       (Property, Tenant, Lease, Payment…)
```

---

## `supabase/` — migrations SQL

Chaque fichier `.sql` est une migration à exécuter dans le SQL Editor de Supabase (dans l'ordre).

| Fichier | Rôle |
|---------|------|
| `schema.sql` | Tables initiales (properties, tenants, leases, payments) |
| `migration_multi_tenant.sql` | Ajoute organizations, memberships, subscriptions, super_admins |
| `profiles.sql` | Table profiles + triggers auth.users |
| `fix_rls.sql` | Corrige la récursion RLS (utilise SECURITY DEFINER) |
| `migration_tenant_portal.sql` | Portail locataire : user_id sur tenants, issues, fonctions auth_tenant_* |
| `migration_owners_and_sale.sql` | Table owners + biens à vendre |
| `migration_visits.sql` | Table visits (demandes publiques) |
| `migration_issue_photos.sql` | Photos sur issues |
| `migration_profile_address.sql` | Ajoute address sur profiles |
| `migration_enforce_limits.sql` | Triggers DB enforçant les limites de plan |
| `migration_subscription_status.sql` | Statuts abonnement |
| `storage.sql` | Buckets property-photos et issue-photos |
| `super_admin_setup.sql` | Comment définir un super-admin |
| `fix_critical.sql` | Patchs critiques |

Détails dans [04-database.md](04-database.md).

---

## `public/` — assets statiques

```
public/
├── favicon.ico
├── plaquette-jappaleimmo.pdf       ← Brochure commerciale (généré)
├── docs/
│   ├── pdfs/                       ← PDFs de la doc utilisateur (12 fichiers)
│   └── <section>/*.png             ← 47 captures d'écran
```

Tout fichier dans `public/` est servi à `/<nom-du-fichier>`. Exemple : `public/plaquette-jappaleimmo.pdf` → `https://www.jappaleimmo.com/plaquette-jappaleimmo.pdf`.

---

## `scripts/` — automatisations

Scripts Node.js qui utilisent Playwright pour contrôler un navigateur headless et faire des tâches répétitives.

| Script | Rôle |
|--------|------|
| `screenshots.mjs` | Regénère les 47 captures d'écran de la doc (remplace temporairement les infos perso par des valeurs fictives) |
| `pdfs.mjs` | Regénère les 12 PDFs de la doc (11 sections + guide complet) |
| `brochure.mjs` | Regénère `public/plaquette-jappaleimmo.pdf` à partir de la page `/plaquette` |
| `restore-profile.mjs` | Restaure manuellement les infos du profil admin si `screenshots.mjs` échoue avant d'avoir restauré |

Détails d'utilisation dans [13-scripts.md](13-scripts.md).

---

## Conventions de nommage

| Quoi | Convention | Exemple |
|------|------------|---------|
| Composant React | PascalCase, fichier `.tsx` | `SidebarNav`, `sidebar-nav.tsx` |
| Variable / fonction | camelCase | `currentUser`, `formatPrice()` |
| Constante globale | UPPER_SNAKE | `MAX_PROPERTIES`, `CRON_SECRET` |
| Fichier route | Nom fixe imposé par Next.js | `page.tsx`, `layout.tsx`, `route.ts` |
| Dossier route | kebab-case | `forgot-password`, `send-quittance` |
| Table SQL | snake_case pluriel | `organizations`, `tenants`, `payments` |
| Enum SQL | UPPER_SNAKE | `ACTIVE`, `PENDING`, `WAVE` |

---

## Alias d'import

Dans `tsconfig.json`, l'alias `@/` pointe vers `src/`. On écrit donc :

```ts
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
```

Au lieu de :

```ts
import { Button } from "../../../components/ui/button";
```

---

## Prochaine lecture

→ [04-database.md](04-database.md) : toutes les tables, colonnes, relations et policies.
