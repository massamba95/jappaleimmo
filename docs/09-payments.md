# 09 — Paiements

Il y a **deux types de paiements** dans Jappalé Immo — à ne pas confondre :

1. **Loyers** : les paiements que les **locataires** font à leur **agence** (table `payments`)
2. **Abonnements Jappalé Immo** : les paiements que les **agences** font à **toi** (table `subscriptions`)

---

## 1. Loyers

### Modèle de données

Table `payments`, colonnes principales :

| Colonne | Valeurs | Signification |
|---------|---------|---------------|
| `status` | `PENDING` | Créé, en attente de paiement |
|          | `LATE` | Échéance dépassée, non payé |
|          | `PARTIAL` | Payé partiellement |
|          | `PAID` | Payé intégralement |
| `method` | `CASH`, `TRANSFER`, `WAVE`, `ORANGE_MONEY` | Moyen de paiement enregistré |

### Cycle de vie d'un paiement

```
┌──────────┐  Cron 1er du mois     ┌──────────┐
│  Bail    │ ──generate-payments──▶│ PENDING  │
│ ACTIVE   │                       └────┬─────┘
└──────────┘                            │
                                        │ Cron quotidien mark-late
                                        │ (si due_date < today)
                                        ▼
                                   ┌──────────┐
                                   │   LATE   │
                                   └────┬─────┘
                                        │
        Agent enregistre un paiement partiel ou complet
                                        │
                                        ▼
                            ┌───────────┴──────────┐
                            │                      │
                            ▼                      ▼
                      ┌──────────┐           ┌──────────┐
                      │ PARTIAL  │           │   PAID   │
                      └──────────┘           └──────────┘
```

### Qui crée les payments ?

**Automatiquement** : le cron `/api/cron/generate-payments` le 1er de chaque mois.

Pour chaque bail `ACTIVE`, il crée une ligne `payments` :
```sql
INSERT INTO payments (lease_id, amount, due_date, status)
VALUES (<lease>, <lease.rent_amount>, '<1er du mois courant>', 'PENDING')
```

⚠️ **Idempotent** : si le cron tourne 2 fois dans le même mois, il ne crée pas de doublon (il vérifie qu'il n'existe pas déjà un payment pour ce bail ce mois-ci).

### Enregistrer un paiement (manuel)

L'agent va sur `/dashboard/payments`, clique sur un paiement, saisit :
- Date de paiement effectif (`paid_date`)
- Montant effectif (peut être < `amount` → paiement partiel)
- Moyen (`method` : cash, transfert, Wave, OM)

Le statut est calculé automatiquement :
- Si `paid_amount >= amount` → `PAID`
- Si `paid_amount > 0 && < amount` → `PARTIAL`

### Envoyer une quittance

Sur un paiement `PAID`, l'agent clique « Envoyer la quittance ». Cela déclenche :
- `POST /api/dashboard/payments/[id]/send-quittance`
- Génération du PDF via `src/lib/pdf/quittance.ts`
- Envoi par Resend au locataire

Le locataire retrouve ses quittances dans son portail à `/locataire/documents`.

### Rappels automatiques

Cron `/api/cron/send-reminders` tous les jours à 08h UTC : envoie un rappel email au locataire si le paiement est `PENDING` ou `LATE` depuis 0, 3, 7, 14, 21 jours (puis tous les 7 jours). Voir [08-emails.md](08-emails.md).

---

## 2. Abonnements Jappalé Immo

### Modèle de données

Table `subscriptions`, colonnes principales :

| Colonne | Valeurs | Signification |
|---------|---------|---------------|
| `plan` | `PRO`, `AGENCY`, `ENTERPRISE` | Plan souscrit (FREE n'a pas de subscription) |
| `amount` | int | Montant facturé en FCFA |
| `status` | `PENDING_VALIDATION` | En attente de validation par le super-admin |
|          | `ACTIVE` | En cours, valide |
|          | `PAST_DUE` | Expirée, non renouvelée |
|          | `CANCELLED` | Résiliée |
| `payment_method` | `WAVE`, `ORANGE_MONEY` | |
| `current_period_end` | timestamp | Fin de la période en cours |

### Les plans et leurs tarifs

| Plan | Tarif mensuel | Biens max | Membres max |
|------|---------------|-----------|-------------|
| FREE | 0 FCFA | 1 | 1 |
| PRO | 5 000 FCFA | 3 | 3 |
| AGENCY | 10 000 FCFA | 15 | 10 |
| ENTERPRISE | 20 000 FCFA | ∞ | ∞ |

Ces valeurs sont dans `src/lib/plans.ts`.

---

## Intégration Wave / Orange Money

### État actuel : semi-manuel

Jappalé Immo **n'est pas encore connecté** aux APIs Wave / Orange Money. Le flux actuel :

```
1. Agence clique /dashboard/upgrade
2. Choisit un plan, voit les numéros marchands (Wave + OM)
   → NEXT_PUBLIC_WAVE_PHONE / NEXT_PUBLIC_OM_PHONE
3. Elle paie depuis son app Wave/OM sur ces numéros
4. Elle saisit le numéro de transaction dans l'app
5. POST /api/subscriptions/request
   → crée subscriptions en status='PENDING_VALIDATION'
6. Toi (super-admin) reçois un email de notif
7. Tu vas sur /super-admin/abonnements
8. Tu vérifies que la transaction est bien arrivée sur ton compte Wave/OM
9. Tu cliques "Valider"
   → status='ACTIVE', org.plan upgradé, trigger DB met à jour max_properties
```

### Évolution à prévoir (pas encore fait)

**Intégration API Wave** (<https://docs.wave.com/business>) :
- Créer un token Wave Business
- Webhook qui pointe vers `/api/webhooks/wave`
- À la réception du webhook « payment.completed », matcher par `transaction_id` → valider automatiquement

**Intégration API Orange Money** : idem mais l'API Orange Sénégal est plus complexe (convention commerciale à négocier avec Orange).

**Checklist si on veut implémenter** :
- [ ] Ouvrir un compte marchand Wave Business
- [ ] Configurer webhook dans Wave Dashboard
- [ ] Ajouter variable `WAVE_WEBHOOK_SECRET` dans Vercel
- [ ] Créer `/api/webhooks/wave/route.ts` avec vérif signature
- [ ] Logique de matching transaction → subscription
- [ ] Test en sandbox
- [ ] Basculer en prod

---

## Cas particuliers / FAQ ops

### Un client paie hors-app (virement à l'agence)
Impossible pour les loyers (le locataire paye l'agence, pas l'app). Possible pour les abonnements Jappalé si un client paie par espèces à Massamba : on crée la subscription manuellement en SQL.

### Un client demande un remboursement
Pas d'automatisation. Rembourser manuellement via Wave/OM puis :
```sql
UPDATE subscriptions SET status='CANCELLED' WHERE id='<uuid>';
-- Optionnel : rétrograder immédiatement
UPDATE organizations SET plan='FREE', max_properties=1, max_members=1 WHERE id='<org>';
```

### Le cron `generate-payments` n'a pas tourné
Le cron tourne le 1er du mois. S'il a foiré, on peut le déclencher manuellement :
```bash
curl https://www.jappaleimmo.com/api/cron/generate-payments \
  -H "Authorization: Bearer $CRON_SECRET"
```
Il est idempotent : ne crée pas de doublon si déjà fait.

### Un loyer n'a pas été marqué LATE
Même principe : déclencher manuellement `/api/cron/mark-late`.

Voir [12-operations.md](12-operations.md) pour le runbook complet.

---

## Prochaine lecture

→ [10-crons.md](10-crons.md) : tous les jobs planifiés en détail.
