# 13 — Scripts de maintenance

Les scripts dans `scripts/*.mjs` sont des **automatisations Node.js** qui utilisent **Playwright** (bibliothèque qui pilote un navigateur headless) pour :
- Prendre des captures d'écran de l'app
- Générer des PDFs à partir des pages web
- Faire des tâches de maintenance

💡 **Playwright** : un vrai Chrome tourne en arrière-plan, exécuté par un script. On peut lui dire « va sur cette page, clique ce bouton, remplis ce formulaire, prends une photo, etc. ». C'est comme Selenium mais plus moderne et rapide.

---

## Prérequis pour exécuter les scripts

1. **Node.js 20+** installé en local
2. **Playwright** installé via `npm install` (première fois : `npx playwright install chromium`)
3. Un fichier `.env.local.screenshots` à la racine (gitignored) :
   ```
   DEMO_BASE_URL=https://www.jappaleimmo.com
   DEMO_ADMIN_EMAIL=<email compte démo admin>
   DEMO_ADMIN_PASSWORD=<mot de passe>
   ```

⚠️ **`DEMO_BASE_URL`** : c'est l'URL cible. Mettre la prod pour une régénération officielle, ou `http://localhost:3000` pour tester localement.

---

## `scripts/screenshots.mjs`

**Rôle** : regénère automatiquement les 47 captures d'écran de la doc utilisateur dans `public/docs/**/*.png`.

**Ce qu'il fait** :
```
1. Lance un Chrome headless
2. Se connecte à DEMO_BASE_URL avec DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD
3. Sauvegarde les infos perso du profil admin (phone, email, address)
4. Remplace par des valeurs fictives :
   - phone: "77 000 11 22"
   - email: "contact@jappaleimmo.com"
   - address: "Dakar, Plateau"
5. Parcourt toutes les pages du dashboard et du portail locataire
6. À chaque page, masque les emails restants dans le DOM (TreeWalker)
7. Prend une capture d'écran
8. Une fois fini, restaure les infos perso originales
```

**Usage** :
```bash
node scripts/screenshots.mjs
```

**Durée** : 3-5 minutes selon le réseau.

⚠️ **Si le script plante au milieu** : les infos perso peuvent rester en valeurs fictives dans le profil. Utiliser `scripts/restore-profile.mjs` pour restaurer manuellement.

---

## `scripts/pdfs.mjs`

**Rôle** : regénère les 12 PDFs de la doc utilisateur (11 sections + guide complet 50 pages).

**Ce qu'il fait** :
```
1. Lance Chrome headless en mode print
2. Pour chaque page /aide/<section> :
   - La charge
   - Appelle page.pdf() → génère un PDF A4 avec header/footer
3. Assemble tous les PDFs en un guide-complet.pdf via pdf-lib
```

**Usage** :
```bash
node scripts/pdfs.mjs
```

**Durée** : 1-2 minutes.

**Sortie** : `public/docs/pdfs/*.pdf`

---

## `scripts/brochure.mjs`

**Rôle** : regénère la plaquette commerciale PDF.

**Ce qu'il fait** :
```
1. Ouvre la page /plaquette sur DEMO_BASE_URL
2. Applique emulateMedia("print")
3. Capture en PDF A4 (6 pages)
4. Enregistre dans public/plaquette-jappaleimmo.pdf
```

**Usage** :
```bash
node scripts/brochure.mjs
```

**Durée** : 10 secondes.

**Sortie** : `public/plaquette-jappaleimmo.pdf` (~225 Ko).

---

## `scripts/restore-profile.mjs`

**Rôle** : filet de sécurité qui restaure manuellement les infos perso du profil admin si `screenshots.mjs` a planté avant de le faire lui-même.

**Usage** :
```bash
node scripts/restore-profile.mjs
```

**Effet** : se connecte à `/dashboard/settings`, réécrit :
- `phone = 0755244619`
- `address = Dakar, Sicap Liberté 6`

Ne touche pas à l'email (trop dangereux, ça change le login).

⚠️ Les valeurs hardcodées dans ce script sont **tes valeurs perso actuelles**. Si tu changes tes infos, penser à modifier ce fichier.

---

## Workflow type : regénérer toute la doc

```bash
# Assure-toi que la prod est à jour (sinon les screenshots captureront du vieux)
git push origin main
# Attends ~1 min le déploiement Vercel

# 1. Screenshots (fait aussi le login, la substitution, la restauration)
node scripts/screenshots.mjs

# 2. PDFs
node scripts/pdfs.mjs

# 3. Commit
git add public/docs/
git commit -m "chore: regenerate user documentation"
git push
```

---

## Ajouter un nouveau script

Template à suivre :

```js
// scripts/mon-script.mjs
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// Lire .env.local.screenshots
const envPath = path.join(ROOT, ".env.local.screenshots");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const [key, ...rest] = trimmed.split("=");
    process.env[key] = rest.join("=");
  });
}

const BASE = process.env.DEMO_BASE_URL || "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "fr-FR" });
  const page = await context.newPage();

  try {
    // ... ton code ici
  } finally {
    await browser.close();
  }
}

main();
```

---

## Limites / attention

- **Ne pas lancer plusieurs scripts en parallèle** : ils se logguent avec le même compte et peuvent se perturber (cookies de session).
- **Le plan gratuit Vercel a un rate limit** sur les requêtes rapides. Si un script fait 50 captures en 30s, on peut se faire rate-limit temporairement. `page.waitForTimeout(500)` entre chaque capture suffit généralement.
- **Les scripts n'ont pas de tests automatisés** — il faut vérifier visuellement le résultat après chaque run.

---

## Prochaine lecture

→ [14-glossary.md](14-glossary.md) : glossaire des termes techniques.
