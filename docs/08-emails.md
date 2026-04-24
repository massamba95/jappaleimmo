# 08 — Emails transactionnels

Ce document décrit comment l'application envoie des emails automatiques, et comment les boîtes pro (`@jappaleimmo.com`) sont configurées.

---

## Deux systèmes mail, deux rôles

| Système | Rôle | Quand |
|---------|------|-------|
| **Resend** | Emails **sortants automatiques** de l'app | Reset password, rappels de loyer, quittances |
| **Zoho Mail** | **Boîtes pro** (reçues + envoyées manuellement) | `contact@`, `support@`, `massamba@` |

⚠️ **Important** : un locataire qui reçoit un rappel de loyer, s'il répond, son email arrive chez **Zoho** (car l'adresse de l'expéditeur est `noreply@jappaleimmo.com`, même domaine que les boîtes Zoho).

---

## Configuration DNS partagée

Pour que les deux cohabitent sans conflit, on a séparé :

| Enregistrement | Cible | Qui l'utilise |
|----------------|-------|----------------|
| `MX @` | `mx.zoho.eu`, `mx2.zoho.eu`, `mx3.zoho.eu` | Zoho (réception des mails) |
| `TXT @` (SPF) | `v=spf1 include:zoho.eu ~all` | Zoho (envoi) |
| `TXT zmail._domainkey` | DKIM Zoho | Zoho (signature) |
| `TXT resend._domainkey` | DKIM Resend | Resend (signature) |
| `MX send` | `feedback-smtp.eu-west-1.amazonses.com` | Resend (bounces) |
| `TXT send` | `v=spf1 include:amazonses.com ~all` | Resend (SPF sur sous-domaine) |
| `TXT _dmarc` | `v=DMARC1; p=none; rua=mailto:massamba@jappaleimmo.com` | DMARC (monitoring) |

💡 **Ruse** : Resend utilise le sous-domaine `send.jappaleimmo.com` pour ses envois (envelope sender), ce qui isole sa réputation du domaine principal géré par Zoho. Et comme le DKIM est signé sur le domaine racine (`jappaleimmo.com`), DMARC passe via alignement DKIM.

Score mail-tester : **10/10** (vérifié le 24/04/2026).

---

## Resend — emails transactionnels

### Configuration

- **API** : <https://api.resend.com/emails>
- **Auth** : `Authorization: Bearer RESEND_API_KEY`
- **Expéditeur par défaut** : `"Jappalé Immo <noreply@jappaleimmo.com>"`

### Les 3 endroits qui envoient un email

#### 1. Reset password
**Fichier** : `src/app/api/auth/request-reset/route.ts`

**Déclencheur** : user clique « Mot de passe oublié » sur `/login` → `/forgot-password` → POST cette route.

**Template** : email HTML avec :
- Logo Jappalé
- Bouton « Réinitialiser mon mot de passe » (lien généré par Supabase, valide 24h)
- Mentions légales + disclaimer « si vous n'avez pas demandé ce changement... »

#### 2. Rappel de loyer
**Fichier** : `src/app/api/cron/send-reminders/route.ts`

**Déclencheur** : cron tous les jours à 08h UTC.

**Logique d'envoi** : pour chaque paiement `PENDING`/`LATE`, calcule `days_since_due` et envoie si :
- `days_since_due == 0` (jour J de l'échéance)
- `days_since_due == 3`
- `days_since_due == 7`
- `days_since_due == 14`
- `days_since_due == 21`
- puis tous les 7 jours

**Template** : email HTML avec :
- Nom du locataire
- Bien concerné (adresse)
- Montant dû + date d'échéance
- Agence (nom, téléphone de contact)
- Ton adapté selon le nombre de jours de retard

#### 3. Quittance de paiement
**Fichier** : `src/app/api/dashboard/payments/[id]/send-quittance/route.ts`

**Déclencheur** : un membre de l'agence clique « Envoyer la quittance » sur un paiement marqué PAID.

**Logique** :
1. Récupère le payment + lease + tenant + property + org
2. Génère le PDF de quittance via `src/lib/pdf/quittance.ts` (jsPDF)
3. Convertit le PDF en base64
4. POST Resend avec `attachments: [{ filename: "quittance.pdf", content: base64 }]`
5. Met à jour `payments.receipt_url`

**Template email** : court, « Vous trouverez en pièce jointe votre quittance de loyer pour [mois]. »

---

## Zoho Mail — boîtes pro

### Boîtes actives (plan Forever Free — 5 boîtes max)

| Adresse | Utilisateur | Usage |
|---------|-------------|-------|
| `massamba@jappaleimmo.com` | Massamba (admin) | Commercial, signatures |
| `contact@jappaleimmo.com` | Compte Contact | Formulaires site, clients |
| `support@jappaleimmo.com` | Compte Support | SAV, réponses aux locataires |

### Accès

- **Webmail** : <https://mail.zoho.eu>
- **App mobile** : Zoho Mail (iOS / Android)
- **IMAP/SMTP** : réservé au plan payant (~1 €/user/mois)

### Redirection recommandée

Dans Zoho Admin Console → Users → `contact@jappaleimmo.com` → Mail Forwarding → ajouter `massamba@jappaleimmo.com`. Idem pour `support@`. Comme ça un seul webmail à vérifier.

### Aliases (gratuits, illimités)

Dans Zoho Admin → Mail Accounts → Email Aliases. On peut ajouter :
- `hello@jappaleimmo.com`
- `admin@jappaleimmo.com`
- `ia@jappaleimmo.com`

Tous redirigent vers la boîte principale.

---

## Dépannage courant

### Un mail n'arrive pas

1. **Vérifier les logs Resend** : <https://resend.com/emails>. On voit chaque tentative avec le statut (delivered, bounced, opened).
2. **Vérifier les logs Vercel** : la route API a-t-elle bien été appelée ? Y a-t-il une erreur 500 ?
3. **Vérifier le spam du destinataire**.
4. **Tester la délivrabilité** : <https://mail-tester.com> depuis `noreply@jappaleimmo.com` (impossible depuis l'app, mais on peut envoyer via Resend en ligne de commande).

### Un mail arrive en spam

Priorité :
1. Vérifier que SPF/DKIM/DMARC sont tous verts sur <https://mxtoolbox.com>
2. Vérifier qu'on n'est pas blacklisté : <https://www.mail-tester.com> + <https://mxtoolbox.com/blacklists.aspx>
3. Si OK : c'est souvent le **contenu** (trop de liens, mots filtrés, HTML mal formé). Simplifier le template.

### Erreur 401 Resend
```
401 Unauthorized: Invalid API key
```
→ Vérifier la variable `RESEND_API_KEY` dans Vercel (Settings → Environment Variables).

### Erreur 403 Resend
```
403 Forbidden: Domain not verified
```
→ Le domaine `jappaleimmo.com` a été retiré du compte Resend. À remettre via <https://resend.com/domains>.

### Erreur 429 Resend
```
429 Too Many Requests
```
→ Limite de rate atteinte. Sur le plan gratuit Resend : 100 emails/jour, 3 emails/seconde. Passer au plan payant si les crons envoient trop.

---

## Ce qui n'est PAS implémenté

- ❌ **Tracking d'ouverture** : on ne sait pas si un mail a été lu. Resend le propose mais on n'a pas activé les pixels de tracking.
- ❌ **Templates variables en DB** : les templates sont en dur dans le code. Pour les modifier, il faut toucher au code + redéployer.
- ❌ **Envoi depuis un 2e domaine** (ex: pour un tenant qui aurait un sous-domaine custom).
- ❌ **SMS** : pas d'envoi SMS pour les rappels. Envisagé plus tard (Twilio, Orange Sénégal API).

---

## Prochaine lecture

→ [09-payments.md](09-payments.md) : modèle des paiements et intégrations Wave/OM.
