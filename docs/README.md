# Documentation technique — Jappalé Immo

Cette documentation est destinée à **toute personne qui doit comprendre, maintenir ou faire évoluer le code** de l'application : toi (Massamba, admin sys/réseau), un futur développeur, un prestataire, ou un repreneur.

Elle part du principe que le lecteur :
- Connaît bien SQL, Linux, DNS, HTTP, git, shell, réseau.
- Ne connaît **pas forcément** les concepts spécifiques du web moderne (React, Next.js, Tailwind, etc.). Chaque concept web important est expliqué à son premier usage.

> 💡 Si tu es un utilisateur final (agence, locataire) et pas un technicien : la doc qui te correspond est sur **<https://www.jappaleimmo.com/aide>**.

---

## Table des matières

### Pour commencer

| # | Fichier | Contenu |
|---|---------|---------|
| 01 | [Stack technique](01-stack.md) | Les briques logicielles (Next.js, Supabase, Resend, Vercel, Tailwind…) et pourquoi elles |
| 02 | [Architecture globale](02-architecture.md) | Vue d'ensemble, flux d'une requête du navigateur à la DB |
| 03 | [Organisation du code](03-code-structure.md) | Comment les fichiers sont rangés, conventions Next.js App Router |

### Le cœur du système

| # | Fichier | Contenu |
|---|---------|---------|
| 04 | [Base de données](04-database.md) | Tables, colonnes, relations, RLS, triggers, fonctions |
| 05 | [Authentification](05-authentication.md) | Comment les utilisateurs se connectent, sessions, rôles |
| 06 | [Multi-tenant](06-multi-tenant.md) | Comment les agences sont isolées les unes des autres |
| 07 | [Routes API](07-api-routes.md) | Les endpoints du backend, ce qu'ils font, qui peut les appeler |

### Les fonctionnalités intégrées

| # | Fichier | Contenu |
|---|---------|---------|
| 08 | [Emails transactionnels](08-emails.md) | Resend, templates, Zoho pour les boîtes pro |
| 09 | [Paiements](09-payments.md) | Statuts, génération automatique, Wave / Orange Money |
| 10 | [Crons](10-crons.md) | Jobs planifiés (paiements, rappels, expiration) |

### Opérations

| # | Fichier | Contenu |
|---|---------|---------|
| 11 | [Déploiement](11-deployment.md) | Vercel, variables d'environnement, DNS, CI/CD |
| 12 | [Runbook d'exploitation](12-operations.md) | Que faire si… (mot de passe perdu, paiement bloqué, etc.) |
| 13 | [Scripts de maintenance](13-scripts.md) | Les scripts Playwright (screenshots, PDFs, plaquette) |

### Annexes

| # | Fichier | Contenu |
|---|---------|---------|
| 14 | [Glossaire](14-glossary.md) | Termes techniques web/SaaS (JSX, SSR, middleware, RLS…) |

---

## Convention de lecture

Dans cette doc, les **chemins de fichiers** utilisent la racine du projet (ex: `src/lib/supabase/server.ts`).
Les **routes web** sont préfixées par `/` (ex: `/dashboard/properties`).
Les **routes API** sont explicitement marquées (ex: `GET /api/cron/mark-late`).

Les encadrés 💡 signalent un concept web que je prends le temps d'expliquer pour un sys admin.
Les encadrés ⚠️ signalent un piège connu ou une contrainte à respecter.
