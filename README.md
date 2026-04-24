# Jappalé Immo

Plateforme SaaS de gestion immobilière pour le marché sénégalais et africain.

**Production** · <https://www.jappaleimmo.com>
**Documentation utilisateur** · <https://www.jappaleimmo.com/aide>
**Plaquette commerciale** · <https://www.jappaleimmo.com/plaquette-jappaleimmo.pdf>

---

## Qu'est-ce que c'est ?

Un SaaS multi-tenant où chaque agence (ou propriétaire) dispose de son propre espace isolé pour gérer ses biens, locataires, baux, paiements et quittances. Un portail séparé permet aux locataires d'accéder à leurs propres informations (contrat, paiements, quittances, signalements).

Destiné au marché **Sénégal + Afrique de l'Ouest** : devise FCFA, paiement par Wave ou Orange Money, UI en français.

## Stack

| Composant | Technologie |
|-----------|-------------|
| Framework web | Next.js 16 (App Router) + React 19 |
| Base de données | Supabase (PostgreSQL + Row Level Security) |
| Authentification | Supabase Auth (email/password, magic link, reset) |
| Storage | Supabase Storage (buckets publics) |
| Emails | Resend (transactionnel) + Zoho Mail (boîtes pro) |
| UI | Tailwind CSS v4 + shadcn/ui |
| PDF | jsPDF + pdf-lib |
| Hébergement | Vercel (fluid compute + crons) |
| Domaine email | jappaleimmo.com (SPF + DKIM + DMARC) |

## Documentation technique

Toute la doc technique (architecture, DB, code, déploiement, runbook...) est dans le dossier [`docs/`](docs/README.md).

Points d'entrée principaux :

- 📘 [Vue d'ensemble & architecture](docs/02-architecture.md)
- 🗄️ [Base de données](docs/04-database.md)
- 🧩 [Organisation du code](docs/03-code-structure.md)
- 🚀 [Déploiement](docs/11-deployment.md)
- 🛠️ [Runbook d'exploitation](docs/12-operations.md)

## Installation locale (développement)

### Prérequis
- Node.js 20+
- npm
- Compte Supabase avec un projet créé
- Compte Resend avec domaine vérifié (optionnel en dev)

### Étapes

```bash
# 1. Cloner le projet
git clone https://github.com/massamba95/jappaleimmo.git
cd dakaimmo

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.local.example .env.local
# Remplir avec vos valeurs (voir docs/11-deployment.md pour le détail)

# 4. Appliquer les migrations SQL sur le projet Supabase
# Exécuter dans l'ordre les fichiers de supabase/*.sql dans le SQL Editor

# 5. Lancer en mode dev
npm run dev
# → http://localhost:3000
```

## Structure du projet

```
dakaimmo/
├── src/
│   ├── app/              # Pages et routes API (Next.js App Router)
│   ├── components/       # Composants React (dashboard, ui, docs)
│   ├── lib/              # Utilitaires (supabase, permissions, PDF)
│   └── types/            # Types TypeScript
├── supabase/             # Migrations SQL (schéma, RLS, fonctions)
├── public/
│   ├── docs/             # Screenshots + PDFs de la doc utilisateur
│   └── plaquette-jappaleimmo.pdf
├── scripts/              # Automatisations (Playwright)
└── docs/                 # Documentation technique
```

Détail complet : voir [docs/03-code-structure.md](docs/03-code-structure.md).

## Scripts utiles

| Commande | Effet |
|----------|-------|
| `npm run dev` | Serveur de développement sur :3000 |
| `npm run build` | Build de production |
| `npm run lint` | Vérifie la qualité du code |
| `node scripts/pdfs.mjs` | Regénère les PDFs de la doc utilisateur depuis la prod |
| `node scripts/brochure.mjs` | Regénère la plaquette commerciale |
| `node scripts/screenshots.mjs` | Regénère les 47 captures d'écran de la doc |

## Versioning

Le champ `version` de `package.json` suit le versionnement sémantique (MAJOR.MINOR.PATCH). Voir [`CHANGELOG.md`](CHANGELOG.md) pour l'historique.

## Licence

Propriétaire · © 2026 Jappalé Immo · Tous droits réservés.
