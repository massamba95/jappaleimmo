# 12 — Runbook d'exploitation

Procédures pour résoudre les situations qui arrivent en vrai quand tu gères la plateforme.

---

## Contacts / dashboards à garder en favoris

| Ressource | URL |
|-----------|-----|
| Prod | <https://www.jappaleimmo.com> |
| Vercel Dashboard | <https://vercel.com/dashboard> |
| Supabase Dashboard | <https://supabase.com/dashboard> |
| Resend Dashboard | <https://resend.com/emails> |
| Zoho Mail Admin | <https://mailadmin.zoho.eu> |
| GitHub repo | <https://github.com/massamba95/jappaleimmo> |

---

## 1. Un utilisateur a oublié son mot de passe

**Cas courant** : lui dire de cliquer « Mot de passe oublié » sur `/login`. Il reçoit un email → reset lui-même.

**Si l'email de reset n'arrive pas** :
1. Vérifier <https://resend.com/emails> : l'email a-t-il été envoyé ? statut ?
2. Vérifier son dossier spam
3. En dernier recours, reset manuel :
   - Supabase Dashboard → **Authentication** → **Users**
   - Trouver l'utilisateur par email → **...** → **Reset password**
   - Ou directement : **... → Send recovery email**

---

## 2. Un locataire voit l'espace d'un autre locataire

⚠️ **Grave**. Symptômes : un locataire se connecte et voit les infos d'un autre.

**Cause probable** : la colonne `tenants.user_id` est mal liée. Un nouvel utilisateur a pris l'ID d'un ancien tenant par le mécanisme de fallback par email.

**Diagnostic** :
```sql
-- Trouver les tenants avec un user_id en commun
SELECT user_id, array_agg(id) as tenant_ids, array_agg(email) as emails
FROM tenants
WHERE user_id IS NOT NULL
GROUP BY user_id
HAVING COUNT(*) > 1;
```

**Correctif** :
```sql
-- Déconnecter le tenant mal lié
UPDATE tenants SET user_id = NULL WHERE id = '<tenant_incorrect>';

-- Le vrai locataire doit se reconnecter, l'auto-link refera le lien correct
```

Voir le fix dans `src/app/api/locataire/init/route.ts` (filtre `.is("user_id", null)` + vérif `org_id`).

---

## 3. Un paiement Wave/Orange Money n'est pas validé

**Contexte** : un client a upgrade, payé, mais sa demande reste `PENDING_VALIDATION`.

**Procédure** :
1. Aller sur `/super-admin/abonnements`
2. Trouver la demande (statut PENDING_VALIDATION, nom de l'org, numéro de transaction)
3. Ouvrir son compte Wave ou Orange Money
4. Chercher la transaction par le numéro saisi par le client
5. Si trouvée → cliquer « Valider » dans le dashboard Jappalé
6. Si pas trouvée → contacter le client (maybe fausse info)

---

## 4. Le cron `generate-payments` n'a pas tourné

**Symptômes** : le 2 du mois, les agences n'ont pas leurs nouveaux paiements en attente.

**Diagnostic** :
1. Vercel → Logs → filtrer `/api/cron/generate-payments`
2. Vérifier la date/heure de dernière exécution
3. Vérifier qu'il n'y a pas eu d'erreur 500 ou 401

**Correctif** :
```bash
# Déclencher manuellement
curl https://www.jappaleimmo.com/api/cron/generate-payments \
  -H "Authorization: Bearer $CRON_SECRET"
```

Idempotent, pas de risque de doublon.

---

## 5. Un client veut upgrade son plan manuellement (SQL)

**Cas** : paiement reçu hors-app, ou cadeau, ou fix urgent.

```sql
-- 1. Trouver l'org
SELECT id, name, plan, max_properties, max_members
FROM organizations WHERE name ILIKE '%<nom>%';

-- 2. Mettre à jour les limites selon le plan cible
UPDATE organizations
SET plan = 'AGENCY',
    max_properties = 15,
    max_members = 10,
    status = 'ACTIVE'
WHERE id = '<uuid>';

-- 3. Créer la subscription correspondante
INSERT INTO subscriptions (org_id, plan, amount, status, payment_method, current_period_start, current_period_end)
VALUES (
  '<org_uuid>', 'AGENCY', 10000, 'ACTIVE', 'WAVE',
  now(), now() + interval '1 month'
);
```

---

## 6. Un client est bloqué par `subscription-expired-wall`

**Contexte** : le cron `expire-subscriptions` est passé, l'org est repassée en FREE, le mur s'affiche.

**Si paiement légitime manqué** :
Même procédure que point 5 (upgrade SQL). Mettre `status='ACTIVE'` sur la subscription **et** `plan='<plan>'` sur l'org.

**Pour juste lever le mur temporairement** :
```sql
UPDATE organizations SET status='ACTIVE' WHERE id = '<uuid>';
```
Ne remet pas les limites du plan — attention.

---

## 7. Un email n'arrive pas

Cf. [08-emails.md § Dépannage courant](08-emails.md#dépannage-courant).

Résumé :
1. Logs Resend
2. Spam du destinataire
3. mail-tester.com
4. mxtoolbox pour blacklist

---

## 8. La prod est down

### Symptôme : le site ne répond pas

1. **<https://www.jappaleimmo.com>** renvoie une erreur Vercel
2. Check <https://www.vercel-status.com> : Vercel est-il en panne ?
3. Check **Vercel Dashboard → Deployments** : le dernier deploy est-il « Ready » ?
4. Si dernier deploy = « Error », promote un ancien en rollback (cf. [11-deployment.md](11-deployment.md#rollback-durgence))

### Symptôme : le site charge mais les données ne chargent pas

1. Check **Supabase Dashboard** : l'instance est-elle « Healthy » ?
2. Check <https://status.supabase.com>
3. Si Supabase est down : attendre. Envoyer un tweet/mail aux clients pour info.

### Symptôme : les logins échouent

1. Check si c'est spécifique à un compte (tester avec ton compte admin)
2. Si tous comptes : check auth.users dans Supabase
3. Vérifier qu'aucun trigger AFTER INSERT/UPDATE sur auth.users n'est buggé (cf. `feedback_auth_triggers.md` : ne jamais ajouter de tel trigger).

---

## 9. Regénérer la doc utilisateur (screenshots + PDFs)

Quand une fonctionnalité change visuellement, la doc devient obsolète. Pour la regénérer :

```bash
# 1. S'assurer que .env.local.screenshots est rempli
cat .env.local.screenshots
# DEMO_BASE_URL=https://www.jappaleimmo.com
# DEMO_ADMIN_EMAIL=diopmassamba78@gmail.com
# DEMO_ADMIN_PASSWORD=<mdp>

# 2. Regénérer les screenshots (remplace temporairement les infos perso par des valeurs fictives)
node scripts/screenshots.mjs

# 3. Regénérer les PDFs à partir des pages /aide
node scripts/pdfs.mjs

# 4. Commit et push
git add public/docs/
git commit -m "chore: regenerate user documentation screenshots & pdfs"
git push
```

Si `scripts/screenshots.mjs` plante avant d'avoir restauré le profil :
```bash
node scripts/restore-profile.mjs
```

Détails dans [13-scripts.md](13-scripts.md).

---

## 10. Regénérer la plaquette commerciale

```bash
node scripts/brochure.mjs
git add public/plaquette-jappaleimmo.pdf
git commit -m "chore: regenerate commercial brochure"
git push
```

---

## 11. Supprimer définitivement un client

Cas RGPD ou demande explicite. À faire dans cet ordre :

```sql
-- 1. Récupérer l'org_id
SELECT id FROM organizations WHERE name = '<nom>';

-- 2. Supprimer en cascade (attention, destructif)
DELETE FROM payments WHERE lease_id IN (
  SELECT l.id FROM leases l
  JOIN properties p ON p.id = l.property_id
  WHERE p.org_id = '<org_uuid>'
);
DELETE FROM leases WHERE property_id IN (
  SELECT id FROM properties WHERE org_id = '<org_uuid>'
);
DELETE FROM properties WHERE org_id = '<org_uuid>';
DELETE FROM tenants WHERE org_id = '<org_uuid>';
DELETE FROM owners WHERE org_id = '<org_uuid>';
DELETE FROM issues WHERE org_id = '<org_uuid>';
DELETE FROM visits WHERE org_id = '<org_uuid>';
DELETE FROM subscriptions WHERE org_id = '<org_uuid>';
DELETE FROM memberships WHERE org_id = '<org_uuid>';
DELETE FROM organizations WHERE id = '<org_uuid>';

-- 3. Optionnel : supprimer les users auth qui étaient membres (via Supabase UI)
```

⚠️ **Toujours faire un backup avant** (Supabase Dashboard → Database → Backups → Create backup).

---

## 12. Changer le mot de passe admin Supabase

Supabase Dashboard → **Project Settings** → **Database** → **Reset Database Password**.

⚠️ Cela ne change pas `SUPABASE_SERVICE_ROLE_KEY`. Pour régénérer celle-ci :
**Project Settings** → **API** → **Reset service role key**. Après reset, **mettre à jour la variable dans Vercel et redéployer**.

---

## 13. Faire un backup manuel de la DB

Supabase Dashboard → **Database** → **Backups** → **Create backup**.

Ou export complet :
**Database → Replication → Full dump** → télécharge un `.sql` qu'on peut restaurer.

⚠️ Les backups auto gratuits ne sont conservés que 7 jours. Pour un backup longue durée, garder le dump en local ou sur Drive.

---

## 14. Récupérer les stats d'utilisation

Sur `/super-admin` : stats globales en temps réel (nb orgs, revenu mensuel, etc.).

Pour des analyses plus poussées, exécuter du SQL sur Supabase :

```sql
-- Top 10 agences par nombre de biens
SELECT o.name, COUNT(p.id) as properties_count
FROM organizations o
LEFT JOIN properties p ON p.org_id = o.id
GROUP BY o.id ORDER BY properties_count DESC LIMIT 10;

-- Revenu prévisionnel par mois (abonnements actifs)
SELECT SUM(amount) FROM subscriptions WHERE status='ACTIVE';

-- Taux d'impayés
SELECT
  COUNT(*) FILTER (WHERE status IN ('LATE','PARTIAL')) as impayes,
  COUNT(*) as total,
  (COUNT(*) FILTER (WHERE status IN ('LATE','PARTIAL')))::float / COUNT(*) * 100 as pct
FROM payments
WHERE due_date >= date_trunc('month', now());
```

---

## Prochaine lecture

→ [13-scripts.md](13-scripts.md) : détail des scripts Playwright.
