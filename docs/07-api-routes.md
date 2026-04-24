# 07 — Routes API

Les routes API sont les **endpoints HTTP** du backend. Elles sont définies dans `src/app/api/**/route.ts` et exécutées côté serveur (Vercel).

💡 **Convention Next.js** : un fichier `src/app/api/foo/bar/route.ts` expose `/api/foo/bar`. Il exporte des fonctions nommées `GET`, `POST`, `PUT`, `DELETE` selon les méthodes HTTP à supporter.

---

## Organisation

```
src/app/api/
├── auth/              ← Authentification
├── cron/              ← Crons (appelés par Vercel)
├── admin/             ← Super-admin
├── dashboard/         ← Agence (org members)
├── locataire/         ← Portail locataire
├── public/            ← Publique (sans auth)
└── subscriptions/     ← Upgrades d'abonnement
```

---

## `/api/auth/*` — authentification

### `GET /api/auth/callback`
**Rôle** : callback OAuth de Supabase. Quand un utilisateur clique un magic link ou fait un OAuth Google, il atterrit ici. Le code échange le `code` contre une session et pose les cookies.

**Auth** : session en cours d'établissement.

### `POST /api/auth/request-reset`
**Rôle** : envoie un email de réinitialisation de mot de passe via Resend (au lieu du mail par défaut de Supabase).

**Payload** : `{ email: string }`

**Effet** : utilise `supabase.auth.admin.generateLink({ type: 'recovery' })` puis envoie l'email.

**Auth** : publique.

---

## `/api/cron/*` — tâches planifiées

⚠️ **Toutes ces routes vérifient le header `Authorization: Bearer <CRON_SECRET>`.**

### `GET /api/cron/generate-payments`
**Rôle** : crée les paiements `PENDING` du mois pour tous les baux `ACTIVE`.

**Logique** :
```sql
FOR EACH lease WHERE status='ACTIVE':
  IF NOT EXISTS (payment WHERE lease_id=lease.id AND EXTRACT(month FROM due_date) = current_month):
    INSERT INTO payments (lease_id, amount=lease.rent_amount, due_date=first_of_month, status='PENDING')
```

**Schedule** : `0 8 1 * *` (1er du mois à 08h UTC).

### `GET /api/cron/send-reminders`
**Rôle** : envoie des emails de rappel aux locataires dont le loyer est en attente ou en retard.

**Logique** : pour chaque paiement `PENDING` ou `LATE`, calcule les jours depuis l'échéance. Envoie un email si on est à J0, J+3, J+7, J+14, J+21.

**Schedule** : `0 8 * * *` (tous les jours à 08h UTC).

### `GET /api/cron/mark-late`
**Rôle** : bascule les paiements `PENDING` en `LATE` si la date d'échéance est passée.

**Logique** :
```sql
UPDATE payments SET status='LATE'
WHERE status='PENDING' AND due_date < now()
```

**Schedule** : `0 6 * * *` (tous les jours à 06h UTC).

### `GET /api/cron/expire-subscriptions`
**Rôle** : rétrograde les abonnements expirés. Fait passer l'org en plan FREE.

**Logique** : voir [06-multi-tenant.md § Expiration](06-multi-tenant.md).

**Schedule** : `0 1 * * *` (tous les jours à 01h UTC).

---

## `/api/admin/*` — super-admin

Toutes ces routes **vérifient que l'utilisateur est dans `super_admins`**. Elles utilisent le client Supabase admin pour bypass RLS et voir toutes les orgs.

### `GET /api/admin/stats`
**Rôle** : statistiques globales de la plateforme.

**Retourne** :
```json
{
  "totalOrgs": 42,
  "activeOrgs": 30,
  "trialOrgs": 8,
  "blockedOrgs": 4,
  "totalMembers": 156,
  "totalProperties": 1234,
  "monthlyRevenue": 450000
}
```

### `GET /api/admin/organisations`
Liste de toutes les organisations avec leurs détails (nb membres, nb biens, statut subscription, etc.).

### `GET /api/admin/organisations/[id]` / `PUT` / `DELETE`
CRUD sur une organisation précise.

### `GET /api/admin/subscriptions` / `[id]` / `PUT` / `DELETE`
Idem pour les abonnements. La validation manuelle des demandes Wave/OM passe par un `PUT` qui change le statut en `ACTIVE`.

---

## `/api/dashboard/*` — routes agence

Toutes ces routes vérifient que l'utilisateur est un membre `ACTIVE` d'une org. Le `org_id` est déduit de sa session.

### `GET /api/dashboard/notifications`
Retourne les notifications actives pour l'org : paiements en retard, nouvelles demandes de visite, signalements non résolus.

### `GET /api/dashboard/issues` / `PUT /api/dashboard/issues/[id]` / `DELETE`
CRUD sur les signalements de l'org.

### `POST /api/dashboard/payments/[id]/send-quittance`
**Rôle** : génère un PDF de quittance avec `jsPDF` et l'envoie au locataire via Resend.

**Logique** :
```
1. SELECT payment + lease + tenant + property
2. Génère le PDF avec src/lib/pdf/quittance.ts
3. POST https://api.resend.com/emails avec le PDF en attachment
4. UPDATE payments SET receipt_url = <url>
```

### `POST /api/dashboard/tenants/[id]/invite`
**Rôle** : envoie un magic link Supabase à l'email du locataire pour qu'il active son espace.

### `GET /api/dashboard/visits` / `POST`
Liste/crée des demandes de visite de l'org.

### `PUT /api/dashboard/visits/[id]` / `DELETE`
Modifie/supprime une visite.

### `POST /api/dashboard/import/properties`
Importe un CSV de biens. Valide le format, crée les lignes en bulk. Vérifie la limite du plan avant.

### `POST /api/dashboard/import/tenants`
Idem pour les locataires.

---

## `/api/locataire/*` — portail locataire

Toutes ces routes utilisent les fonctions SECURITY DEFINER (`auth_tenant_id()` etc.) pour retrouver les données du locataire connecté.

### `GET /api/locataire/init`
**Rôle** : première route appelée à la connexion du locataire. Vérifie qu'il a bien une ligne `tenants.user_id = auth.uid()`. Si oui, retourne ses infos. Si non, essaie un fallback par email (avec garde-fous anti cross-leak).

**Retourne** : `{ tenantId, orgId, orgName, firstName, lastName, ... }`

### `GET /api/locataire/issues` / `POST`
Liste/crée les signalements du locataire connecté.

### `GET /api/locataire/notifications`
Notifs pour le locataire : paiements en retard, issues résolues, nouvelles quittances.

---

## `/api/public/*` — publique (pas d'auth)

### `POST /api/public/visits`
**Rôle** : formulaire public de demande de visite. Utilisé sur les mini-sites d'agences `/agences/[slug]`.

**Payload** :
```json
{
  "property_id": "uuid",
  "visitor_name": "Abdou",
  "visitor_phone": "+221 77 000 00 00",
  "visitor_email": "abdou@exemple.com",
  "requested_date": "2026-05-10",
  "requested_time": "14:00",
  "message": "Bonjour, je suis intéressé..."
}
```

**Auth** : publique. Utilise le client admin pour INSERT (RLS laisse passer les INSERT publics sur `visits`).

---

## `/api/subscriptions/*` — abonnements

### `POST /api/subscriptions/request`
**Rôle** : un ADMIN d'une org demande un upgrade. Crée une subscription `PENDING_VALIDATION` qui devra être validée par le super-admin.

**Payload** :
```json
{
  "plan": "AGENCY",
  "payment_method": "WAVE",
  "transaction_id": "ABCDEF123"
}
```

**Effet** : insert dans `subscriptions` avec statut `PENDING_VALIDATION`. Envoie un email à l'admin de Jappalé Immo (toi) pour notification.

---

## Codes de réponse HTTP utilisés

| Code | Signification | Exemple |
|------|---------------|---------|
| 200 | OK | Lecture réussie |
| 201 | Created | Création réussie |
| 400 | Bad Request | Payload invalide |
| 401 | Unauthorized | Pas de session ou token invalide |
| 403 | Forbidden | Session OK mais pas le rôle requis |
| 404 | Not Found | Ressource inexistante ou inaccessible |
| 500 | Internal Server Error | Bug serveur |

---

## Comment tester une route API

### Depuis un terminal (curl)

```bash
# Lire une route publique
curl https://www.jappaleimmo.com/api/public/visits \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"property_id":"..."}'

# Déclencher un cron manuellement (en prod)
curl https://www.jappaleimmo.com/api/cron/mark-late \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Depuis la console du navigateur (routes authentifiées)

```js
await fetch("/api/dashboard/notifications").then(r => r.json())
```

(Les cookies de session sont envoyés automatiquement.)

### Logs

Les `console.log` et erreurs des routes API sont visibles dans le dashboard Vercel → **Logs**.

---

## Prochaine lecture

→ [08-emails.md](08-emails.md) : comment sont envoyés les emails transactionnels.
