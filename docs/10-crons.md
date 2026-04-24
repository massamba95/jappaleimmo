# 10 — Crons / jobs planifiés

Les crons sont des routes API que **Vercel déclenche automatiquement à intervalles réguliers**. Ils sont déclarés dans `vercel.json`.

---

## Configuration Vercel

```json
{
  "crons": [
    { "path": "/api/cron/generate-payments",    "schedule": "0 8 1 * *" },
    { "path": "/api/cron/send-reminders",       "schedule": "0 8 * * *" },
    { "path": "/api/cron/mark-late",            "schedule": "0 6 * * *" },
    { "path": "/api/cron/expire-subscriptions", "schedule": "0 1 * * *" }
  ]
}
```

💡 **Format cron** : `minute heure jour-du-mois mois jour-semaine`.
- `0 8 * * *` = tous les jours à 08:00
- `0 8 1 * *` = le 1er jour de chaque mois à 08:00

⚠️ **Fuseau horaire** : Vercel utilise **UTC**. Le Sénégal est UTC+0 en hiver et UTC+0 aussi en été (pas de DST). Donc 08h UTC = 08h Dakar. Pour la France, il faut décaler (10h Paris en été, 9h en hiver).

---

## Sécurité : CRON_SECRET

Toutes les routes `/api/cron/*` vérifient un header :

```ts
const auth = request.headers.get("authorization");
if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response("Unauthorized", { status: 401 });
}
```

Vercel envoie ce header automatiquement quand il déclenche le cron. Un appel externe (ex: un attaquant qui découvre l'URL) sera rejeté.

⚠️ Si `CRON_SECRET` n'est pas défini dans Vercel → les crons tomberont en 401 et n'exécuteront rien. C'est silencieux, pas d'alerte → **à vérifier dans le dashboard Vercel > Logs régulièrement**.

---

## Les 4 crons en détail

### 1. `generate-payments` — 1er du mois à 08h UTC

**Route** : `src/app/api/cron/generate-payments/route.ts`

**Rôle** : créer les paiements `PENDING` du mois pour tous les baux actifs.

**Pseudo-code** :
```ts
const { data: leases } = await admin.from("leases").select("*").eq("status", "ACTIVE");
for (const lease of leases) {
  const dueDate = firstOfCurrentMonth();
  const exists = await admin.from("payments")
    .select("id").eq("lease_id", lease.id).eq("due_date", dueDate).maybeSingle();
  if (exists) continue;
  await admin.from("payments").insert({
    lease_id: lease.id,
    amount: lease.rent_amount,
    due_date: dueDate,
    status: "PENDING",
  });
}
```

**Idempotent** : oui, relancer manuellement ne crée pas de doublon.

### 2. `send-reminders` — tous les jours à 08h UTC

**Route** : `src/app/api/cron/send-reminders/route.ts`

**Rôle** : envoyer des emails de rappel aux locataires avec un paiement en attente ou en retard.

**Pseudo-code** :
```ts
const { data: payments } = await admin.from("payments")
  .select("*, lease:leases(*, tenant:tenants(*), property:properties(*))")
  .in("status", ["PENDING", "LATE"]);
for (const p of payments) {
  const daysSinceDue = daysBetween(p.due_date, today());
  if ([0, 3, 7, 14, 21].includes(daysSinceDue) || (daysSinceDue > 21 && daysSinceDue % 7 === 0)) {
    await sendReminderEmail(p);
  }
}
```

**Rate limit Resend** : plan gratuit = 100 mails/jour. Si on dépasse, il faudra passer en payant (~20 $/mois).

### 3. `mark-late` — tous les jours à 06h UTC

**Route** : `src/app/api/cron/mark-late/route.ts`

**Rôle** : basculer les paiements `PENDING` en `LATE` si la date d'échéance est dépassée.

**Pseudo-code** :
```ts
await admin.from("payments")
  .update({ status: "LATE" })
  .eq("status", "PENDING")
  .lt("due_date", today());
```

**Simple, idempotent**.

### 4. `expire-subscriptions` — tous les jours à 01h UTC

**Route** : `src/app/api/cron/expire-subscriptions/route.ts`

**Rôle** : rétrograder les organisations dont l'abonnement a expiré.

**Pseudo-code** :
```ts
const { data: expired } = await admin.from("subscriptions")
  .select("*").eq("status", "ACTIVE").lt("current_period_end", today());
for (const sub of expired) {
  await admin.from("subscriptions").update({ status: "PAST_DUE" }).eq("id", sub.id);
  await admin.from("organizations").update({
    plan: "FREE", max_properties: 1, max_members: 1
  }).eq("id", sub.org_id);
  // Email de notif à l'admin de l'org
}
```

**Effet côté client** : le composant `subscription-expired-wall.tsx` affiche un mur bloquant dans le dashboard.

---

## Déclencher un cron manuellement

Dans un terminal, avec le bon `CRON_SECRET` :

```bash
# Depuis une machine qui a le secret dans une variable
curl https://www.jappaleimmo.com/api/cron/mark-late \
  -H "Authorization: Bearer $CRON_SECRET"
```

Réponse attendue : un JSON type `{ success: true, updated: 3 }` avec le nombre de lignes traitées.

⚠️ Ne **jamais** mettre `CRON_SECRET` dans un script qui pourrait se retrouver dans git. Le garder dans `.env.local` (gitignored) ou dans un password manager.

---

## Logs

Dans le dashboard Vercel :
1. **Project** → **Logs**
2. Filtrer par `/api/cron/...`
3. On voit les exécutions, durée, réponse

⚠️ Les logs Vercel sont conservés **24h** sur le plan gratuit, **30 jours** sur le plan Pro. Pour un historique plus long, exporter dans un système externe (Datadog, Logtail, etc.) — non fait pour l'instant.

---

## Limites du plan Vercel

| Plan Vercel | Crons | Max execution time | Max crons concurrents |
|-------------|-------|--------------------|-----------------------|
| Hobby (gratuit) | ✅ illimité | 10s par défaut | 1 |
| Pro | ✅ | 60s (Fluid Compute: jusqu'à 300s) | illimité |

**Jappalé Immo est-il sur Hobby ou Pro ?** À vérifier sur <https://vercel.com/account/billing>. Si le cron `send-reminders` devient lent (beaucoup de mails), il faudra passer Pro pour éviter le timeout à 10s.

---

## Monitoring & alertes

**Actuellement** : aucun monitoring actif. Si un cron échoue, on ne le sait qu'en regardant les logs Vercel.

**À prévoir** :
- Endpoint de healthcheck (ex: `/api/health`) qui renvoie les dates de dernière exécution des crons
- Intégration UptimeRobot ou BetterUptime pour pinger cet endpoint et alerter si un cron ne tourne plus

---

## Prochaine lecture

→ [11-deployment.md](11-deployment.md) : variables d'environnement, déploiement, DNS.
