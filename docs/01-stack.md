# 01 — Stack technique

Ce document explique **chaque brique** de l'application et son rôle, avec des analogies quand c'est utile pour un admin sys/réseau.

## Vue d'ensemble

```
┌──────────────────────┐
│    NAVIGATEUR        │  Chrome / Safari / Firefox du client
│  (React / Next.js)   │
└──────────┬───────────┘
           │ HTTPS
┌──────────▼───────────┐
│      VERCEL          │  Hébergement + CDN + Fluid Compute + Crons
│   (Next.js server)   │
└──────────┬───────────┘
           │
     ┌─────┴─────┬──────────┬──────────┐
     ▼           ▼          ▼          ▼
 ┌────────┐ ┌──────────┐ ┌────────┐ ┌─────────┐
 │SUPABASE│ │  RESEND  │ │  ZOHO  │ │  WAVE   │
 │ (DB +  │ │ (emails  │ │ (mails │ │   /OM   │
 │ Auth + │ │transact.)│ │ pros)  │ │ (paie-  │
 │Storage)│ │          │ │        │ │ ments)  │
 └────────┘ └──────────┘ └────────┘ └─────────┘
```

Chaque composant est un service externe (sauf le code Next.js qui tourne sur Vercel). L'application n'héberge **aucune** base de données ni service tiers en propre.

---

## 1. Next.js 16 — le framework web

**Rôle** : framework qui génère les pages web et qui expose les routes API. C'est lui qui tourne sur Vercel.

**Analogie sys admin** : c'est comme un serveur applicatif (Apache + PHP, ou Tomcat + Java) mais pour le langage JavaScript/TypeScript. La différence : il génère aussi du **code côté navigateur** (React) en plus du code serveur.

**Concepts Next.js à connaître** :

- **App Router** : convention où chaque dossier dans `src/app/` devient une URL.
  Exemple : `src/app/dashboard/properties/page.tsx` = URL `/dashboard/properties`.

- **Server Component** (par défaut) : le fichier `page.tsx` est exécuté **sur le serveur**. Il peut parler directement à la DB. Le HTML final est envoyé au navigateur.

- **Client Component** (déclaré par `"use client"` en haut du fichier) : le composant est livré au navigateur et s'y exécute (JavaScript dans Chrome). Permet l'interactivité (boutons, formulaires dynamiques).

- **Route API** : un fichier `src/app/api/xxx/route.ts` expose un endpoint HTTP. On y définit des fonctions `GET`, `POST`, `PUT`, `DELETE`.

- **Layout** : un fichier `layout.tsx` enveloppe toutes les pages d'un dossier (header, sidebar commune).

- **Group de routes** : un dossier avec des parenthèses `(auth)`, `(dashboard)`, `(legal)` sert uniquement à grouper des fichiers **sans** apparaître dans l'URL. Exemple : `src/app/(auth)/login/page.tsx` → URL `/login`, pas `/auth/login`.

💡 **Pourquoi Next.js ?** Il combine frontend (ce que voit le client) + backend (API) dans un seul projet, déployé sur Vercel sans configuration. C'est le standard actuel pour un SaaS moderne.

---

## 2. React 19 — le moteur d'interface utilisateur

**Rôle** : bibliothèque qui décrit l'interface sous forme de composants. Next.js utilise React sous le capot.

**Concept clé — JSX** :
```tsx
<Button variant="primary">Se connecter</Button>
```
Ce n'est ni du HTML ni du JavaScript — c'est du **JSX**, une syntaxe hybride. Compilée en JavaScript avant d'être servie.

**Analogie** : comme PHP mélange HTML et code, JSX mélange HTML-like et TypeScript. La différence : JSX ne fait pas de string concatenation, il construit un arbre d'objets.

---

## 3. TypeScript — JavaScript typé

**Rôle** : ajoute des types au JavaScript. Permet de détecter les erreurs au moment du build plutôt qu'en production.

Extensions de fichiers :
- `.ts` = TypeScript pur
- `.tsx` = TypeScript + JSX (interface)

Les types de l'application sont dans `src/types/database.ts`.

---

## 4. Supabase — la base de données + auth + storage

**Rôle** : remplace 3 services en un.

| Composant Supabase | Équivalent classique |
|--------------------|----------------------|
| PostgreSQL managé | Un PostgreSQL installé sur un serveur |
| Auth | Keycloak / Auth0 / système d'auth maison |
| Storage | Un serveur de fichiers (S3, MinIO, FTP) |
| Realtime | Service de WebSocket push |

L'application Jappalé Immo utilise :
- **Postgres** : toutes les tables métier (organizations, properties, tenants, payments…)
- **Auth** : login, signup, magic links, reset password
- **Storage** : deux buckets (`property-photos`, `issue-photos`)

💡 **Row Level Security (RLS)** : PostgreSQL a une fonctionnalité native qui filtre les lignes qu'un utilisateur peut voir, directement au niveau SQL. Jappalé Immo s'appuie fortement là-dessus pour l'isolation multi-tenant. Voir [04-database.md](04-database.md) et [06-multi-tenant.md](06-multi-tenant.md).

**Clients Supabase dans le code** (`src/lib/supabase/`) :
- `server.ts` → client serveur (respecte RLS avec la session de l'utilisateur connecté). Utilisé dans les Server Components et routes API authentifiées.
- `client.ts` → client navigateur. Pour les Client Components qui font des requêtes côté front.
- `admin.ts` → client avec la clé `SERVICE_ROLE_KEY` : **bypass RLS**. À utiliser uniquement côté serveur, dans les crons et les routes admin.

---

## 5. Vercel — l'hébergement

**Rôle** : héberge le code Next.js, sert le site, exécute les crons.

**Analogie sys admin** : c'est un PaaS (Platform-as-a-Service) comme Heroku. Tu pushes du code sur GitHub → Vercel builde et déploie automatiquement.

**Fonctionnalités utilisées** :
- **Auto-deploy** depuis GitHub (branche `main` → production, autres branches → preview)
- **Gestion DNS** du domaine `jappaleimmo.com`
- **Crons** configurés via `vercel.json` (voir [10-crons.md](10-crons.md))
- **Fluid Compute** : les routes API tournent dans des conteneurs Node.js partagés (équivalent serverless amélioré)
- **CDN** global pour les assets statiques (images, PDFs)

---

## 6. Resend — les emails transactionnels

**Rôle** : envoie les emails automatiques de l'application (reset password, rappels de loyer, quittances).

**Analogie** : comme Sendmail/Postfix avec une API REST moderne et une meilleure délivrabilité.

**Configuration** :
- DKIM sur `resend._domainkey.jappaleimmo.com`
- Bounces sur `send.jappaleimmo.com`
- Expéditeur : `"Jappalé Immo <noreply@jappaleimmo.com>"`

Voir [08-emails.md](08-emails.md).

---

## 7. Zoho Mail — les boîtes mail professionnelles

**Rôle** : gère les 3 boîtes pro (`massamba@`, `contact@`, `support@ jappaleimmo.com`).

**N'envoie pas** les emails automatiques de l'app — Resend s'en occupe. Zoho gère uniquement la réception et l'envoi manuel depuis les webmails/apps.

**Config DNS** :
- MX sur `@` → `mx.zoho.eu` (priorité 10, 20, 50)
- SPF : `v=spf1 include:zoho.eu ~all`
- DKIM : `zmail._domainkey.jappaleimmo.com`
- DMARC : `_dmarc.jappaleimmo.com`

---

## 8. Tailwind CSS v4 — le design système

**Rôle** : framework CSS. Au lieu d'écrire du CSS classique, on ajoute des classes utilitaires dans le HTML/JSX.

```tsx
<div className="flex items-center gap-2 p-4 bg-white rounded-lg">
```

- `flex` = display:flex
- `items-center` = align-items:center
- `gap-2` = gap:0.5rem
- `p-4` = padding:1rem
- `bg-white` = background:white
- `rounded-lg` = border-radius:0.5rem

Les styles globaux sont dans `src/app/globals.css` (variables CSS, couleurs de marque).

---

## 9. shadcn/ui — les composants d'interface

**Rôle** : bibliothèque de composants préfabriqués (Button, Input, Card, Table…). Les composants sont copiés dans le projet (pas installés comme dépendance) dans `src/components/ui/`.

---

## 10. Autres bibliothèques

| Paquet | Rôle |
|--------|------|
| `lucide-react` | Icônes (⚙️ Settings, 📄 FileText, etc.) |
| `date-fns` | Manipulation de dates (formater, ajouter des jours…) |
| `jspdf` | Génération de PDF côté serveur (quittances) |
| `pdf-lib` | Fusion de PDFs (guide complet de la doc utilisateur) |
| `sonner` | Notifications toast dans le dashboard |
| `next-themes` | Support du mode sombre (pas encore activé) |
| `playwright` | Automatisation navigateur pour les scripts (screenshots, PDFs) |

---

## Ce que l'application ne fait PAS elle-même

- **Aucune base de données locale** : tout est dans Supabase
- **Aucun serveur mail en propre** : Resend + Zoho
- **Aucun système de paiement intégré** : Wave et Orange Money sont juste des liens/numéros pour l'instant
- **Aucun CDN custom** : Vercel s'en occupe
- **Aucune gestion d'IP / firewall** : c'est Vercel qui gère

## Prochaine lecture

→ [02-architecture.md](02-architecture.md) : comment tout ça interagit pour servir une requête.
