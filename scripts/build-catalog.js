import Ajv2020 from "ajv/dist/2020.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const APPS_DIR = path.join(ROOT, "apps");
const SCHEMAS_DIR = path.join(ROOT, "schemas");
const DIST_DIR = path.join(ROOT, "dist");

const isDryRun = process.argv.includes("--dry-run");

console.log("🔨 Building FynnCloud App Store Catalog...");

// Read Schema
const schemaPath = path.join(SCHEMAS_DIR, "app-manifest-v1.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const ajv = new Ajv2020({ allErrors: true });
const validateManifest = ajv.compile(schema);

const appFolders = fs.readdirSync(APPS_DIR).filter((f) => {
  return fs.statSync(path.join(APPS_DIR, f)).isDirectory();
});

const catalog = {
  version: 1,
  updated_at: new Date().toISOString(),
  total_apps: 0,
  categories: [
    "productivity",
    "collaboration",
    "office",
    "media",
    "ai",
    "utilities",
    "security",
    "system",
    "developer"
  ],
  apps: []
};

for (const appId of appFolders) {
  const appPath = path.join(APPS_DIR, appId);
  const manifestPath = path.join(appPath, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    console.warn(`⚠️  Skipping ${appId}: Missing manifest.json`);
    continue;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  // Ajv 2020-12 Schema Validation
  const isValid = validateManifest(manifest);
  if (!isValid) {
    console.error("❌ Schema validation errors for " + appId + ":", validateManifest.errors);
    throw new Error("Schema validation failed for " + appId);
  }

  // Check ID matches folder
  if (manifest.id !== appId) {
    throw new Error(`❌ App ID mismatch: folder is "${appId}" but manifest.id is "${manifest.id}"`);
  }

  // Check ID regex
  const idRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!idRegex.test(manifest.id)) {
    throw new Error(`❌ Invalid app ID "${manifest.id}". Must match kebab-case: ${idRegex}`);
  }

  // Check Icon & Readme
  const hasIcon = fs.existsSync(path.join(appPath, "icon.svg")) || fs.existsSync(path.join(appPath, "icon.png"));
  const hasReadme = fs.existsSync(path.join(appPath, "README.md"));

  const appEntry = {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    type: manifest.type || "app",
    description: manifest.description || "",
    author: manifest.author || "FynnCloud Community",
    category: manifest.category || "productivity",
    icon: manifest.icon || "heroicons:cube-solid",
    icon_url: hasIcon ? `/apps/${appId}/icon.svg` : null,
    readme_url: hasReadme ? `/apps/${appId}/README.md` : null,
    gradient: manifest.gradient || "from-sky-500 to-indigo-600",
    iconColor: manifest.iconColor || "text-sky-100",
    image: manifest.image || null,
    sidebar: manifest.sidebar !== false,
    compatibility: manifest.compatibility || { fynncloud: ">=1.0.0" },
    permissions: manifest.permissions || [],
    hooks: manifest.hooks || {},
    manifest
  };

  catalog.apps.push(appEntry);
  console.log(`  ✓ ${manifest.id} (v${manifest.version}) [${manifest.category}]`);
}

catalog.total_apps = catalog.apps.length;

if (!isDryRun) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, "schemas"), { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, "apps"), { recursive: true });

  // Write catalog index
  fs.writeFileSync(path.join(DIST_DIR, "index.json"), JSON.stringify(catalog, null, 2));

  // Copy Schema
  fs.copyFileSync(schemaPath, path.join(DIST_DIR, "schemas", "app-manifest-v1.json"));

  // Copy app assets (icons, screenshots, READMEs)
  for (const appId of appFolders) {
    const srcDir = path.join(APPS_DIR, appId);
    const destDir = path.join(DIST_DIR, "apps", appId);
    fs.mkdirSync(destDir, { recursive: true });

    for (const file of fs.readdirSync(srcDir)) {
      const srcFile = path.join(srcDir, file);
      const destFile = path.join(destDir, file);
      if (fs.statSync(srcFile).isFile()) {
        fs.copyFileSync(srcFile, destFile);
      }
    }
  }

  console.log(`
✅ Generated dist/index.json with ${catalog.total_apps} apps!`);
} else {
  console.log(`
✅ Validation successful for ${catalog.total_apps} apps (Dry Run).`);
}
