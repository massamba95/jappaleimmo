# 02 — Architecture globale

Ce document décrit **comment les briques techniques interagissent** pour servir une requête, depuis le clic utilisateur jusqu'à la base de données.

---

## Vue d'ensemble des flux

```
        ┌───────────────────────────────────────────────────────────┐
        │                    NAVIGATEUR (le client)                  │
        │  Chrome / Safari, sur téléphone ou ordinateur              │
        │  Exécute du code React (composants Client)                 │
        └─────────────────────────┬─────────────────────────────────┘
                                  │
                          HTTPS (TLS)
                                  │
        ┌─────────────────────────▼─────────────────────────────────┐
        │                     VERCEL (fluid compute)                 │
        │  ┌──────────────────┐   ┌─────────────────────────────┐  │
        │  │ Serveur Next.js  │   │    Crons planifiés          │  │
        │  │ (App Router)     │   │  (vercel.json)              │  │
        │  │                  │   │  08h : rappels / génération │  │
        │  │ - Server Comp.   │   │  06h : mark-late            │  │
        │  │ - Routes API     │   │  01h : expire-subscriptions │  │
        │  └────────┬─────────┘   └──────────────┬──────────────┘  │
        └───────────┼──────────────────────────────┼───────────────┘
                    │                              │
       ┌────────────┴──────┬─────────────┬───────┴──────────┐
       │                   │             │                  │
       ▼                   ▼             ▼                  ▼
   ┌───────┐         ┌──────────┐   ┌──────────┐      ┌──────────┐
   │Supabase│         │  Resend  │   │ (Wave/OM │      │   DNS    │
   │        │         │  (SMTP   │   │  liens   │      │  Vercel  │
   │Postgres│         │  /api)   │   │  Whats   │      │  (MX     │
   │  Auth  │         │          │   │  App)    │      │  Zoho)   │
   │Storage │         │          │   │          │      │          │
   └───────┘         └──────────┘   └──────────┘      └──────────┘
```

---

## Exemple 1 — Flux d'un chargement de page du dashboard

Scénario : Un gérant d'agence ouvre `https://www.jappaleimmo.com/dashboard/properties`.

```
1. Navigateur → DNS Vercel → résout jappaleimmo.com
2. Navigateur → HTTPS → Vercel Edge
3. Vercel identifie la route : src/app/(dashboard)/dashboard/properties/page.tsx
4. Le Server Component s'exécute côté Vercel :
   a. Lit le cookie de session (Supabase SSR)
   b. Crée un client Supabase serveur (src/lib/supabase/server.ts)
   c. Requête SQL via Supabase :
      SELECT * FROM properties WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
      → Grâce aux RLS policies, la requête est filtrée automatiquement
5. Supabase renvoie les données → Vercel
6. React rend le HTML côté serveur (SSR) avec les données
7. HTML envoyé au navigateur → affichage immédiat
8. Le navigateur télécharge le JS nécessaire et « hydrate » la page
   (rend les boutons interactifs, etc.)
```

💡 **SSR (Server-Side Rendering)** : le HTML est généré côté serveur au lieu d'être construit dans le navigateur. Avantages : plus rapide au premier affichage, meilleur SEO. Équivalent classique : PHP, mais en JavaScript.

---

## Exemple 2 — Flux d'une action utilisateur (créer un bien)

```
1. Utilisateur remplit le formulaire /dashboard/properties/new
   → C'est un Client Component ("use client")
2. Clic sur "Enregistrer"
   → Le JS dans le navigateur appelle le client Supabase (src/lib/supabase/client.ts)
   → INSERT INTO properties (...) VALUES (...)
3. Supabase reçoit la requête avec le JWT de session (cookie)
4. RLS check :
   - La policy "prop_insert" vérifie que org_id est bien une org de l'utilisateur
   - Le trigger enforce_property_limit vérifie que la limite du plan n'est pas dépassée
5. Si OK : INSERT exécuté, nouvelle ligne créée
6. Supabase renvoie la ligne créée → navigateur
7. L'app redirige vers /dashboard/properties
```

---

## Exemple 3 — Flux d'un cron (génération mensuelle des paiements)

Le 1er de chaque mois à 08h (UTC par défaut sur Vercel) :

```
1. Vercel déclenche GET /api/cron/generate-payments
   Header: Authorization: Bearer <CRON_SECRET>
2. La route API vérifie le Bearer token :
   if (token !== process.env.CRON_SECRET) return 401
3. Client Supabase admin (bypass RLS) :
   SELECT * FROM leases WHERE status = 'ACTIVE'
4. Pour chaque bail :
   INSERT INTO payments (lease_id, amount, due_date, status)
   VALUES (..., '2026-05-01', 'PENDING')
   (si n'existe pas déjà pour le mois courant)
5. Réponse JSON { created: N } renvoyée à Vercel
   (uniquement consommée par Vercel, pas de client humain)
```

Voir [10-crons.md](10-crons.md) pour tous les crons.

---

## Exemple 4 — Flux d'un email de rappel

Le cron `/api/cron/send-reminders` s'exécute tous les jours à 08h :

```
1. SELECT * FROM payments WHERE status IN ('PENDING','LATE')
   JOIN leases, tenants → récupère l'email du locataire
2. Calcule le nombre de jours depuis due_date
3. Si J0, J+3, J+7, J+14, J+21 → envoie un email :
   POST https://api.resend.com/emails
   Authorization: Bearer RESEND_API_KEY
   Body: {
     from: "Jappalé Immo <noreply@jappaleimmo.com>",
     to: "locataire@exemple.com",
     subject: "Rappel de loyer",
     html: "<p>Votre loyer de 150 000 FCFA...</p>"
   }
4. Resend signe avec DKIM (resend._domainkey.jappaleimmo.com)
5. L'email arrive dans la boîte du locataire
```

---

## Séparation Frontend / Backend

Dans Jappalé Immo, **tout est dans un seul projet Next.js**. Pas de service séparé. C'est ce qu'on appelle une architecture « full-stack Next.js ».

| Type | Où il tourne | Exemple |
|------|--------------|---------|
| Server Component | Vercel (serveur) | `src/app/(dashboard)/dashboard/properties/page.tsx` |
| Client Component | Navigateur | `src/app/(dashboard)/dashboard/properties/new/page.tsx` (déclare `"use client"`) |
| Route API | Vercel (serveur) | `src/app/api/cron/mark-late/route.ts` |
| Fichier statique | CDN Vercel | `/public/plaquette-jappaleimmo.pdf` |

---

## Multi-tenant en une phrase

**Une organisation = une agence**. Tout (biens, locataires, paiements…) appartient à une `org_id`. Les policies RLS filtrent automatiquement pour qu'un utilisateur ne voie que les données de son org. Détails dans [06-multi-tenant.md](06-multi-tenant.md).

---

## Les 3 espaces utilisateur

Jappalé Immo présente 3 interfaces distinctes selon le rôle :

1. **Dashboard agence** (`/dashboard/*`) — pour gérer biens/locataires/paiements. Réservé aux membres d'une org.
2. **Portail locataire** (`/locataire/*`) — pour qu'un locataire consulte son contrat, ses paiements, ses quittances. Réservé aux utilisateurs reliés à une ligne de la table `tenants`.
3. **Super-admin** (`/super-admin/*`) — toi uniquement. Gère toutes les orgs, voit les revenus globaux, valide les paiements Wave/Orange Money.

Les layouts de chaque espace font le contrôle d'accès au chargement.

---

## Principe de sécurité appliqué

### Défense en profondeur : 3 couches

1. **Couche application** (Next.js) : les layouts vérifient la session et redirigent vers `/login` si besoin.
2. **Couche base de données** (RLS) : même si un attaquant contourne l'application, PostgreSQL refuse de lui donner des données qu'il n'a pas le droit de voir.
3. **Couche infra** (Vercel + Supabase) : HTTPS obligatoire, clés chiffrées, secrets séparés du code.

### Clés et secrets

- **Clé anon Supabase** : publique, exposée dans le navigateur. RLS empêche l'accès abusif.
- **Clé service_role Supabase** : secret serveur. Permet le bypass RLS. Utilisée uniquement dans `src/lib/supabase/admin.ts` (crons, admin).
- **Clé Resend** : secret serveur. Ne sert jamais côté navigateur.
- **CRON_SECRET** : vérifié dans les routes `/api/cron/*` pour empêcher un tiers de déclencher les crons.

Voir [11-deployment.md](11-deployment.md) pour la liste complète des variables d'environnement.

---

## Prochaine lecture

→ [03-code-structure.md](03-code-structure.md) : comment est organisé le code dans le projet.
