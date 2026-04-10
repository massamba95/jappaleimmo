# DakarImmo

Plateforme SaaS de gestion immobiliere pour le marche senegalais et africain.

## Stack technique

- **Frontend** : Next.js 16 + Tailwind CSS + shadcn/ui
- **Backend** : Supabase (PostgreSQL, Auth, Storage)
- **Deploiement** : Vercel

## Installation

```bash
# Cloner le projet
git clone https://github.com/VOTRE_USERNAME/dakaimmo.git
cd dakaimmo

# Installer les dependances
npm install

# Copier les variables d'environnement
cp .env.local.example .env.local
# Remplir avec vos cles Supabase

# Lancer en mode dev
npm run dev
```

## Configuration Supabase

1. Creer un projet sur [supabase.com](https://supabase.com)
2. Copier l'URL et la cle `anon` dans `.env.local`
3. Executer le script `supabase/schema.sql` dans le SQL Editor de Supabase

## Structure du projet

```
src/
├── app/
│   ├── (auth)/           # Pages login/register
│   ├── (dashboard)/      # Dashboard protege
│   │   └── dashboard/
│   │       ├── properties/
│   │       ├── tenants/
│   │       ├── leases/
│   │       ├── payments/
│   │       └── settings/
│   └── api/auth/         # Callback Supabase Auth
├── components/
│   ├── dashboard/        # Composants du dashboard
│   └── ui/               # Composants shadcn/ui
├── lib/
│   └── supabase/         # Clients Supabase (server/client)
└── types/                # Types TypeScript
```

## Fonctionnalites

- Gestion des biens immobiliers (CRUD)
- Gestion des locataires
- Contrats de bail
- Suivi des paiements
- Tableau de bord avec KPIs
- Authentification securisee
- Row Level Security (RLS) sur toutes les tables
