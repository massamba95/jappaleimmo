// Restauration manuelle du profil d'origine
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

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

const BASE = process.env.DEMO_BASE_URL;
const EMAIL = process.env.DEMO_ADMIN_EMAIL;
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD;

const ORIGINAL = {
  phone: "0755244619",
  address: "Dakar, Sicap Liberté 6",
};

async function fillReactInput(page, selector, value) {
  await page.evaluate(({ selector, value }) => {
    const input = document.querySelector(selector);
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, { selector, value });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "fr-FR" });
const page = await context.newPage();

try {
  console.log(`🔑 Reconnexion à ${BASE}...`);
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.getByRole("button", { name: /connexion|se connecter|login/i }).click();
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), { timeout: 20000 });
  console.log(`  ✅ Connecté`);

  console.log(`🔧 Restauration du profil...`);
  await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await fillReactInput(page, 'input#phone', ORIGINAL.phone);
  await fillReactInput(page, 'input#address', ORIGINAL.address);
  // Le premier formulaire est celui du profil personnel
  await page.locator('form').first().getByRole("button", { name: /enregistrer/i }).click();
  await page.waitForTimeout(3000);
  console.log(`  ✅ Profil restauré: phone=${ORIGINAL.phone}, address=${ORIGINAL.address}`);
} finally {
  await browser.close();
}
