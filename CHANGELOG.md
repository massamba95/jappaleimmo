# Changelog

Toutes les évolutions notables du projet Jappalé Immo sont documentées ici.

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Versionnage : [Sémantique](https://semver.org/lang/fr/) (`MAJOR.MINOR.PATCH`).

---

## [0.5.1] — 2026-04-24

### Ajouté
- Documentation technique exhaustive dans `docs/` (14 fichiers couvrant stack, architecture, DB, auth, multi-tenant, API, emails, paiements, crons, déploiement, runbook, scripts, glossaire).
- `README.md` à jour (stack, installation, scripts utiles, liens vers docs/).
- `CHANGELOG.md` (historique des versions).
- `.env.local.example` complet avec toutes les variables (Supabase, Resend, CRON_SECRET, Wave/OM, scripts).

## [0.5.0] — 2026-04-24

### Ajouté
- Plaquette commerciale A4 (6 pages) à `/plaquette` + export PDF (`public/plaquette-jappaleimmo.pdf`).
- Script `scripts/brochure.mjs` pour regénérer la plaquette.
- Menu hamburger mobile sur la page d'accueil (Documentation, Espace locataire, etc. accessibles depuis mobile).

### Modifié
- Migration du mail de contact public de `diop199526@gmail.com` vers `contact@jappaleimmo.com` (CGU, politique de confidentialité, footer, FAQ).

## [0.4.x] — 2026-04-23

### Ajouté
- Documentation utilisateur complète à `/aide` (11 sections, 47 captures d'écran, 12 PDFs dont guide complet 50 pages).
- Lien « Aide » dans la nav principale.
- Masquage automatique du téléphone / email / adresse dans les captures d'écran (script `screenshots.mjs`).
- Script `scripts/restore-profile.mjs` pour restaurer les infos perso après une capture ratée.
- Refonte du portail locataire en format « espace personnel » avec contact agence (tél/email/adresse).

### Corrigé
- Fuite de données inter-tenants : un nouveau locataire pouvait voir l'espace d'un autre à cause d'un `user_id` manquant dans le filtre auto-link (`.is("user_id", null)` + filtre `org_id`).
- Arrondi de montant de loyer (30 000 → 29 998) corrigé.

## [0.3.x] — 2026-04-14

### Ajouté
- Multi-bail : sélecteur dropdown sur pages accueil et contrat locataire (remplace le bloc-par-bail).
- Pages légales : CGU et politique de confidentialité.

## [0.2.0] — 2026-04-11

### Ajouté
- Architecture multi-tenant complète (`organizations`, `memberships`, policies RLS).
- Rôles granulaires (ADMIN / MANAGER / AGENT / ACCOUNTANT / SECRETARY).
- Limites de plan (FREE / PRO / AGENCY / ENTERPRISE) enforcées au niveau DB via triggers.
- Crons : génération automatique des paiements mensuels, rappels, mark late, expiration des abonnements.
- Intégration Resend pour les emails transactionnels.

## [0.1.0] — 2026-04-10

### Ajouté
- Squelette Next.js + Supabase.
- CRUD propriétés / locataires / baux / paiements.
- Authentification Supabase.
- Tableau de bord avec KPIs.
