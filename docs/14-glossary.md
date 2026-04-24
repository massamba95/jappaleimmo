# 14 — Glossaire

Termes techniques web / SaaS / Supabase utilisés dans cette doc, expliqués en partant du point de vue d'un admin sys/réseau.

---

## A

**App Router**
Convention Next.js récente (v13+) où chaque dossier dans `src/app/` représente une URL. Les fichiers ont des noms fixes : `page.tsx` (la page), `layout.tsx` (l'enveloppe), `route.ts` (une route API).

**auth.users**
Table spéciale de Supabase qui contient les comptes authentifiés (email, mot de passe hashé). On n'y écrit jamais directement — Supabase Auth gère via son SDK.

---

## B

**Bundle JavaScript**
Le code JS livré au navigateur après le build. Next.js le découpe en morceaux (code splitting) pour ne charger que ce qui est nécessaire à la page.

---

## C

**CDN** (Content Delivery Network)
Réseau de serveurs répartis géographiquement qui met en cache les assets statiques (images, PDFs, CSS, JS) près des utilisateurs. Vercel fournit un CDN global. Équivalent classique : CloudFlare, Akamai.

**Client Component**
Un composant React qui s'exécute **dans le navigateur**. Il doit commencer par `"use client";`. Permet l'interactivité (formulaires, clics).

**Cookie HTTP-only**
Cookie que le JavaScript ne peut pas lire (seulement le serveur). Utilisé par Supabase pour les tokens de session — empêche le vol via XSS.

**Cron**
Tâche planifiée. Dans Vercel, déclarée dans `vercel.json`. Le serveur Vercel déclenche une URL à intervalles fixes.

---

## D

**DKIM** (DomainKeys Identified Mail)
Signature cryptographique dans les en-têtes d'un email, qui prouve que le mail vient bien du domaine annoncé. Les clés publiques DKIM sont publiées dans le DNS (enregistrement TXT).

**DMARC** (Domain-based Message Authentication, Reporting and Conformance)
Politique qui dit aux serveurs mail destinataires : « si SPF et DKIM échouent, fais X » (rejeter, mettre en spam, rapporter). Mode `p=none` = monitoring seulement.

---

## E

**Edge**
Dans le jargon Vercel, l'**Edge Runtime** est une version allégée de Node.js exécutée dans des data centers proches des utilisateurs. **Plus recommandé par Vercel** depuis l'arrivée de Fluid Compute.

**Environment variable** (env var)
Variable définie au niveau du système d'exploitation, accessible depuis le code via `process.env.NOM`. Sur Vercel, on les configure dans Settings → Environment Variables.

---

## F

**Fluid Compute** (Vercel)
Successeur de l'Edge Runtime. Containers Node.js qui traitent plusieurs requêtes en parallèle (au lieu d'une par container comme en serverless classique). Moins de cold starts.

**Frontend / Backend**
Dans une app Next.js moderne, la frontière est floue :
- Frontend = ce que le navigateur exécute (React côté client)
- Backend = ce que le serveur Node (Vercel) exécute (Server Components + routes API)

---

## H

**Hydratation** (Hydration)
Quand le navigateur reçoit le HTML rendu par le serveur, il doit ensuite y attacher les handlers JavaScript pour que les boutons, etc. deviennent interactifs. C'est l'hydratation. Prend quelques ms après le premier affichage.

---

## I

**Idempotent**
Une opération est idempotente si on peut la lancer plusieurs fois sans effet secondaire. Ex: `UPDATE users SET active=true WHERE id=X` est idempotent, `INSERT INTO users ...` ne l'est pas.

---

## J

**JSX**
Syntaxe qui mélange HTML et JavaScript. Compilée en JavaScript avant d'être exécutée. Extension de fichier `.tsx` (TypeScript + JSX).

**JWT** (JSON Web Token)
Token d'auth signé cryptographiquement. Contient le user_id et les permissions, lu par le serveur pour identifier l'appelant sans requête DB. Supabase utilise un JWT pour la session (stocké dans un cookie).

---

## L

**Layout** (Next.js)
Composant qui enveloppe toutes les pages d'un dossier. Ex: `src/app/(dashboard)/dashboard/layout.tsx` ajoute la sidebar autour de toutes les pages du dashboard.

---

## M

**Magic Link**
Lien d'authentification cliquable envoyé par email. Cliquer dessus connecte l'utilisateur sans qu'il saisisse de mot de passe. Utilisé pour inviter les locataires.

**Middleware** (Next.js)
Code qui s'exécute entre la requête et la réponse, pour toutes les routes. Exemple : vérifier une session avant de laisser passer. Jappalé Immo **n'en utilise pas** — les layouts font le contrôle d'accès.

**Migration** (SQL)
Fichier SQL qui modifie le schéma de la DB (`CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY`…). On les applique dans l'ordre chronologique.

---

## N

**Next.js**
Framework web full-stack construit sur React. Gère à la fois le rendu (frontend) et les routes API (backend) dans un même projet.

**Nodejs 20 / 24**
Runtime JavaScript côté serveur. Vercel utilise Node.js 24 par défaut (LTS).

---

## P

**Policy** (RLS)
Règle SQL qui dit qui peut `SELECT` / `INSERT` / `UPDATE` / `DELETE` une ligne. Définie par `CREATE POLICY`.

**Preview deployment**
Quand on push sur une branche autre que `main`, Vercel crée un deployment temporaire avec une URL unique. Utile pour tester une feature avant merge.

**props** (React)
Paramètres passés à un composant. Ex: `<Button variant="primary" />` — `variant` est une prop.

---

## R

**React**
Bibliothèque JavaScript pour construire des interfaces à base de composants. Développée par Facebook (Meta).

**Resend**
Service SaaS pour envoyer des emails transactionnels via API. Alternative à SendGrid, Mailgun, Amazon SES.

**RLS** (Row Level Security)
Fonctionnalité PostgreSQL native : des règles filtrent les lignes qu'un utilisateur peut voir/modifier, directement au niveau SQL. Cœur de la sécurité de Jappalé Immo.

---

## S

**Schema** (SQL)
Ensemble de tables, index, fonctions, policies d'une DB. Défini par des scripts SQL dans `supabase/`.

**SECURITY DEFINER** (PostgreSQL)
Flag sur une fonction qui la fait s'exécuter avec les droits du **créateur** au lieu de l'appelant. Utilisé pour contourner RLS dans des cas précis (éviter la récursion infinie).

**Server Component** (Next.js)
Composant React qui s'exécute **sur le serveur** (pas dans le navigateur). Peut parler directement à la DB. C'est le défaut dans Next.js App Router.

**Server-Side Rendering (SSR)**
Technique où le HTML est généré côté serveur à chaque requête, puis envoyé au navigateur. Opposé au Client-Side Rendering (où le navigateur construit le HTML). Meilleur pour SEO et first paint.

**shadcn/ui**
Bibliothèque de composants React préfabriqués (Button, Input, Card…). Particularité : les composants sont **copiés dans le projet** (dans `src/components/ui/`) au lieu d'être installés comme dépendance. On peut donc les modifier librement.

**SPF** (Sender Policy Framework)
Enregistrement DNS TXT qui liste les serveurs autorisés à envoyer des mails pour le domaine. Exemple : `v=spf1 include:zoho.eu ~all`.

**SSR** → voir Server-Side Rendering

**Supabase**
Service SaaS qui combine PostgreSQL managé + authentification + storage + realtime, accessible via API REST et SDK. Open source, alternative à Firebase.

---

## T

**Tailwind CSS**
Framework CSS « utility-first » : au lieu d'écrire du CSS, on compose des classes utilitaires (`flex`, `p-4`, `bg-white`). Le CSS final est généré automatiquement en ne gardant que les classes utilisées.

**Tenant** (SaaS)
Un client de la plateforme multi-tenant. Dans Jappalé Immo, un tenant = une **agence** = une ligne de `organizations`. À ne pas confondre avec `tenants` (locataires immobilier).

**TTL** (Time To Live)
Durée de validité d'un enregistrement DNS ou d'un cache. Plus le TTL est court, plus les changements se propagent vite (mais plus de charge sur les serveurs).

**TypeScript**
Sur-ensemble de JavaScript qui ajoute des types. Détecte les erreurs à la compilation (ex: appeler `.toLowerCase()` sur un nombre).

---

## U

**UUID**
Identifiant unique universel (ex: `a3f4b2c1-...`) utilisé comme clé primaire partout dans Jappalé Immo. Généré côté DB par `gen_random_uuid()`.

---

## V

**Vercel**
Plateforme d'hébergement spécialisée Next.js. Git push → build → déploiement automatique. Gère aussi le CDN, les crons, les previews.

---

## Z

**Zoho Mail**
Service webmail professionnel. Utilisé pour les boîtes `@jappaleimmo.com`. Plan gratuit jusqu'à 5 utilisateurs.
