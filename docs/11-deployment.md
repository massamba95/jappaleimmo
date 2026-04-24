# 11 — Déploiement

Ce document décrit comment Jappalé Immo est déployé en production et comment gérer les environnements.

---

## Hébergement

**Vercel** : <https://vercel.com>

- **Projet** : `jappaleimmo` (ou `dakaimmo` selon le nom configuré)
- **Framework détecté** : Next.js
- **Repo GitHub** : <https://github.com/massamba95/jappaleimmo>
- **Branche de production** : `main`

---

## Flux CI/CD

```
┌──────────────┐    git push origin main    ┌──────────────┐
│  ta machine  │ ─────────────────────────▶ │   GitHub     │
└──────────────┘                            └──────┬───────┘
                                                   │ webhook
                                                   ▼
                                            ┌──────────────┐
                                            │   Vercel     │
                                            │              │
                                            │ 1. Install   │
                                            │ 2. Build     │
                                            │ 3. Deploy    │
                                            └──────┬───────┘
                                                   │
                                                   ▼
                                    https://www.jappaleimmo.com
```

**Push sur `main`** → Vercel déclenche un build → si succès → remplace la prod en quelques secondes (zero-downtime).
**Push sur une autre branche** → Vercel crée un **preview deployment** avec une URL temporaire (ex: `jappaleimmo-git-feature-x-massamba95.vercel.app`).

**Rollback** : Vercel Dashboard → Deployments → clic sur un ancien deployment → « Promote to Production ».

---

## Variables d'environnement

### Liste complète

| Variable | Scope | Rôle | Exemple |
|----------|-------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | public | URL du projet Supabase | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Clé anon Supabase (expose OK, RLS protège) | JWT long |
| `SUPABASE_SERVICE_ROLE_KEY` | secret | Clé admin Supabase (bypass RLS) | JWT long |
| `RESEND_API_KEY` | secret | API Resend | `re_xxxxx` |
| `CRON_SECRET` | secret | Token partagé Vercel ↔ routes cron | chaîne 32+ chars |
| `NEXT_PUBLIC_WAVE_PHONE` | public | Numéro marchand Wave affiché sur upgrade | `+221770000000` |
| `NEXT_PUBLIC_OM_PHONE` | public | Idem Orange Money | `+221770000000` |

💡 **`NEXT_PUBLIC_*`** = exposé dans le navigateur (injecté au build). Tout ce qui n'a pas ce préfixe reste côté serveur.

### Configurer dans Vercel

1. Dashboard Vercel → **Settings** → **Environment Variables**
2. Ajouter chaque variable
3. Cocher les scopes : **Production**, **Preview**, **Development**
4. Sauvegarder → **redéployer** pour que les changements prennent effet

⚠️ **Important** : les variables `NEXT_PUBLIC_*` sont fixées **au build time**. Si on les change, il faut redéployer — redémarrer ne suffit pas.

### En local

- Fichier `.env.local` (gitignored) à la racine du projet
- Utilisé automatiquement par `npm run dev`
- Copier `.env.local.example` et remplir

---

## Domaine & DNS

### Zone `jappaleimmo.com`

DNS géré par **Vercel** (dashboard Vercel → Settings → Domains → `jappaleimmo.com` → DNS Records).

Enregistrements en place :

| Type | Name | Valeur | Rôle |
|------|------|--------|------|
| ALIAS | @ | `cname.vercel-dns-017.com` | Site web (auto géré par Vercel) |
| ALIAS | * | `cname.vercel-dns-017.com` | Sous-domaines (auto géré) |
| MX | @ | `mx.zoho.eu` (10), `mx2.zoho.eu` (20), `mx3.zoho.eu` (50) | Zoho Mail |
| TXT | @ | `v=spf1 include:zoho.eu ~all` | SPF Zoho |
| TXT | @ | `zoho-verification=...` | Vérification domaine Zoho |
| TXT | zmail._domainkey | DKIM Zoho | Signature mails Zoho |
| TXT | resend._domainkey | DKIM Resend | Signature mails Resend |
| TXT | send | `v=spf1 include:amazonses.com ~all` | SPF Resend (sous-domaine send) |
| MX | send | `feedback-smtp.eu-west-1.amazonses.com` | Bounces Resend |
| TXT | _dmarc | `v=DMARC1; p=none; rua=mailto:massamba@jappaleimmo.com` | DMARC monitoring |
| CAA | @ | `0 issue "pki.goog"`, `"sectigo.com"`, `"letsencrypt.org"` | Autorités SSL autorisées |

### Certificat SSL

Géré automatiquement par Vercel (Let's Encrypt). Renouvellement transparent. Pas d'action manuelle requise.

---

## Déployer depuis le terminal (sans passer par git)

```bash
npm i -g vercel
vercel login
vercel --prod
```

⚠️ À éviter pour la prod. Toujours passer par `git push` pour avoir la trace dans le repo. Le CLI est utile pour tester un deployment d'une branche locale.

---

## Environnements

| Environnement | URL | Quand |
|---------------|-----|-------|
| Production | <https://www.jappaleimmo.com> | `git push origin main` |
| Preview | URL Vercel générée | `git push origin <branche>` |
| Development | <http://localhost:3000> | `npm run dev` |

---

## Checks avant de déployer en prod

1. ✅ `npm run build` passe en local
2. ✅ `npm run lint` sans erreurs
3. ✅ Version bumpée dans `package.json` (semver)
4. ✅ Entrée ajoutée dans `CHANGELOG.md`
5. ✅ Tests manuels du parcours impacté en local
6. ✅ Commit message descriptif

Après push :
7. ✅ Vercel montre « Ready » (build réussi)
8. ✅ Ouvrir la prod et tester la feature modifiée
9. ✅ Vérifier les logs Vercel pour 500s

---

## Rollback d'urgence

Si un déploiement casse la prod :

**Option 1 — via Vercel UI**
Dashboard → Deployments → trouver le dernier « Ready » avant le bug → « ... » → **Promote to Production**. Prend 10 secondes.

**Option 2 — via git revert**
```bash
git revert HEAD
git push origin main
```
Crée un commit qui annule le dernier, redéploie automatiquement.

⚠️ **Ne pas utiliser** `git reset --hard` sur `main` : détruit l'historique et confond les autres outils (Vercel, GitHub).

---

## Monitoring de prod

**En place** :
- Logs Vercel (Dashboard → Logs)
- Logs Resend (<https://resend.com/emails>)
- Logs Supabase (Dashboard Supabase → Logs)

**À mettre en place** :
- UptimeRobot ou BetterUptime : ping `/` toutes les 5 min pour alerter en cas d'indispo
- Sentry : capture des erreurs JavaScript runtime (à la fois côté client et serveur)
- PostHog / Plausible : analytics (combien de visites, funnels, etc.)

---

## Quotas & limites à surveiller

| Service | Quota gratuit | Action si dépassé |
|---------|---------------|-------------------|
| Vercel | 100 GB bandwidth/mois, 1000 builds/mois | Passer Pro (~20 $/mois) |
| Supabase | 500 MB DB, 1 GB storage, 2 GB bandwidth/mois | Pro (~25 $/mois) |
| Resend | 100 emails/jour, 3000/mois | Pro (~20 $/mois) |
| Zoho Mail | 5 boîtes, 5 GB/boîte | Mail Lite (~1 €/boîte/mois) |

---

## Prochaine lecture

→ [12-operations.md](12-operations.md) : runbook « que faire si… ».
