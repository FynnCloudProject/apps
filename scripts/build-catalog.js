import { execFileSync, execSync } from "node:child_process";
import semver from "semver";
import { resolveImageDigest } from "./resolve-image-digest.js";
import { imageSize } from "image-size";
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
const requireDigest = process.argv.includes("--require-digest");

// Files an app may publish to the catalog. Everything else in an app folder (Dockerfile, server
// code, package.json, OS junk, ...) is source for the container image and is never published.
const HERO_CANDIDATES = ["hero.webp", "hero.png", "hero.jpg", "hero.jpeg"];
const GALLERY_DIR = "gallery";
const GALLERY_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const MAX_GALLERY_IMAGES = 10;
// Upper bound on older releases listed per app in the catalog (newest first).
const MAX_VERSIONS_PER_APP = 25;

// Relative paths (per app id) that get copied into dist/apps/<id>/
const publishedAssets = new Map();

console.log("Building FynnCloud App Store Catalog...");

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


function validateVersionImmutability(appId, manifest) {
  const baseBranch = process.env.GITHUB_BASE_REF
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : (process.env.CHECK_BASE_REF || null);

  if (!baseBranch) return;

  try {
    execSync(`git rev-parse --verify ${baseBranch}`, { stdio: "ignore" });
  } catch {
    return;
  }

  let baseManifestRaw;
  try {
    baseManifestRaw = execSync(`git show ${baseBranch}:apps/${appId}/manifest.json`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"]
    });
  } catch {
    return; // Brand new app
  }

  let baseManifest;
  try {
    baseManifest = JSON.parse(baseManifestRaw);
  } catch {
    return;
  }

  // Documentation and asset updates (README.md, icon.svg, hero, gallery) can be updated without bumping version.
  // Only changes to manifest.json require a version bump.
  let manifestDiff = "";
  try {
    manifestDiff = execSync(`git diff --name-only ${baseBranch} -- apps/${appId}/manifest.json`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"]
    }).trim();
  } catch {
    return;
  }

  if (manifestDiff.length > 0) {
    const oldVersion = baseManifest.version;
    const newVersion = manifest.version;

    if (!semver.valid(newVersion)) {
      throw new Error(`[error] App "${appId}": Invalid SemVer version "${newVersion}".`);
    }

    if (semver.valid(oldVersion)) {
      if (semver.eq(newVersion, oldVersion)) {
        throw new Error(
          `[error] App "${appId}": Version "${newVersion}" is already published on ${baseBranch}. ` +
          `Published versions are immutable and cannot be modified. You must bump the version in manifest.json (e.g. to ${semver.inc(oldVersion, "patch")}).`
        );
      }

      if (semver.lt(newVersion, oldVersion)) {
        throw new Error(
          `[error] App "${appId}": Version cannot be downgraded from "${oldVersion}" to "${newVersion}".`
        );
      }
    }
  }
}

function validateAppSdkCompatibility(appId, appPath, manifest) {
  const declaredRange = manifest.compatibility?.api_version;
  if (!declaredRange) return;

  let sdkVersion = null;
  const pkgJsonPath = path.join(appPath, "package.json");
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      const dep = pkg.dependencies?.["@fynncloud/app-bridge"] || pkg.devDependencies?.["@fynncloud/app-bridge"] ||
                  pkg.dependencies?.["@fynncloud/app-sdk"] || pkg.devDependencies?.["@fynncloud/app-sdk"];
      if (typeof dep === "string") {
        const min = semver.minVersion(dep);
        sdkVersion = min ? min.version : semver.coerce(dep)?.version || null;
      }
    } catch {}
  }

  if (!sdkVersion) {
    const candidateHtml = [
      path.join(appPath, "public", "index.html"),
      path.join(appPath, "index.html")
    ];
    for (const htmlPath of candidateHtml) {
      if (fs.existsSync(htmlPath)) {
        const content = fs.readFileSync(htmlPath, "utf8");
        const match = /@fynncloud\/(?:app-bridge|app-sdk)@([~^]?\d+\.\d+(?:\.\d+)?)/.exec(content);
        if (match) {
          const raw = match[1];
          const min = semver.minVersion(raw);
          sdkVersion = min ? min.version : semver.coerce(raw)?.version || null;
          if (sdkVersion) break;
        }
      }
    }
  }

  if (!sdkVersion) return;

  const minApi = semver.minVersion(declaredRange);
  if (!minApi) return;

  const sdkMajor = semver.major(sdkVersion);
  const sdkMinor = semver.minor(sdkVersion);
  const apiMajor = semver.major(minApi);
  const apiMinor = semver.minor(minApi);

  if (apiMajor < sdkMajor || (apiMajor === sdkMajor && apiMinor < sdkMinor)) {
    throw new Error(
      `[error] App "${appId}": Uses @fynncloud/app-bridge@${sdkVersion} (targeting API ${sdkMajor}.${sdkMinor}.x), ` +
      `but manifest compatibility.api_version ("${declaredRange}") allows older API versions (< ${sdkMajor}.${sdkMinor}.0). ` +
      `The app's minimum API version must be at least ${sdkMajor}.${sdkMinor}.0.`
    );
  }
}

function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 16 * 1024 * 1024
  });
}

let warnedShallow = false;

/**
 * Derives an app's earlier releases from git history, so maintainers only ever edit manifest.json in place.
 * Every distinct `version` that appeared in apps/<id>/manifest.json becomes a release. For each version the
 * newest commit's manifest wins (a fix-up commit before the bump supersedes a draft), and `released_at` is
 * the date of the oldest commit that carried that version.
 * Returns Map<version, { manifest, released_at }> (empty outside a git checkout).
 */
function collectReleaseHistory(appId) {
  const rel = `apps/${appId}/manifest.json`;
  let commits;
  try {
    if (!warnedShallow && git(["rev-parse", "--is-shallow-repository"]).trim() === "true") {
      warnedShallow = true;
      console.warn("[warn] Shallow git checkout: release history is incomplete. Use fetch-depth: 0.");
    }
    commits = git(["log", "--format=%H%x09%cI", "--", rel])
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [sha, date] = line.split("\t");
        return { sha, date };
      });
  } catch {
    return new Map();
  }

  const releases = new Map();
  for (const { sha, date } of commits) {
    // newest -> oldest
    let old;
    try {
      old = JSON.parse(git(["show", `${sha}:./${rel}`]));
    } catch {
      continue;
    }
    if (!semver.valid(old?.version)) continue;
    const existing = releases.get(old.version);
    if (existing) {
      existing.released_at = date;
    } else {
      releases.set(old.version, { manifest: old, released_at: date });
    }
  }
  return releases;
}

/** Resolves an image digest for an older release. Never fails the build: old images may be gone. */
async function tryResolveDigest(image) {
  if (!image) return { image, digest: null };
  try {
    const res = await resolveImageDigest(image, { githubToken: process.env.GITHUB_TOKEN });
    if (res?.digest) return { image: res.pinnedImage, digest: res.digest };
  } catch {
    // fall through
  }
  return { image, digest: null };
}

function validateMonochromeSvg(svgPath, appId) {
  const content = fs.readFileSync(svgPath, "utf8");

  if (!content.includes("<svg")) {
    throw new Error(`[error] App "${appId}": "icon.svg" is not a valid SVG file.`);
  }

  // Reject gradients, filters, patterns, or embedded raster images
  if (/<(linearGradient|radialGradient|filter|pattern|image)\b/i.test(content)) {
    throw new Error(
      `[error] App "${appId}": "icon.svg" contains gradients, filters, or embedded images. ` +
      `App icons must strictly be monochrome vector glyphs so they adapt cleanly to light and dark themes across FynnCloud.`
    );
  }

  // Reject multiple distinct color fills or strokes
  const colorMatches = content.match(/(?:fill|stroke)\s*=\s*["']([^"']+)["']/gi) || [];
  const uniqueColors = new Set();
  for (const match of colorMatches) {
    const val = match.split("=")[1]?.replace(/["']/g, "").trim().toLowerCase();
    if (val && val !== "none" && val !== "transparent" && val !== "currentcolor") {
      uniqueColors.add(val);
    }
  }

  if (uniqueColors.size > 1) {
    throw new Error(
      `[error] App "${appId}": "icon.svg" contains multiple colors (${Array.from(uniqueColors).join(", ")}). ` +
      `App icons must strictly be monochrome vector glyphs using fill="currentColor" or a single tintable color.`
    );
  }
}

/**
 * Collects the app's gallery images (gallery/ directory, sorted by name unless manifest.gallery
 * gives an explicit order). Returns [{ file, width, height }].
 */
function collectGallery(appPath, appId, manifest) {
  const galleryPath = path.join(appPath, GALLERY_DIR);
  if (!fs.existsSync(galleryPath)) {
    if (Array.isArray(manifest.gallery) && manifest.gallery.length > 0) {
      throw new Error(`[error] App "${appId}": manifest.gallery is set but the "${GALLERY_DIR}/" directory does not exist.`);
    }
    return [];
  }

  const files = fs
    .readdirSync(galleryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => entry.name);

  const unsupported = files.filter((f) => !GALLERY_EXTENSIONS.has(path.extname(f).toLowerCase()));
  if (unsupported.length > 0) {
    throw new Error(
      `[error] App "${appId}": unsupported file(s) in "${GALLERY_DIR}/": ${unsupported.join(", ")}. ` +
      `Gallery images must be ${Array.from(GALLERY_EXTENSIONS).join(", ")}.`
    );
  }

  let ordered = files.sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  if (Array.isArray(manifest.gallery)) {
    const missing = manifest.gallery.filter((f) => !files.includes(f));
    if (missing.length > 0) {
      throw new Error(`[error] App "${appId}": manifest.gallery references missing file(s) in "${GALLERY_DIR}/": ${missing.join(", ")}.`);
    }
    ordered = manifest.gallery;
  }

  if (ordered.length > MAX_GALLERY_IMAGES) {
    throw new Error(`[error] App "${appId}": gallery has ${ordered.length} images; the maximum is ${MAX_GALLERY_IMAGES}.`);
  }

  return ordered.map((file) => {
    let dimensions;
    try {
      dimensions = imageSize(fs.readFileSync(path.join(galleryPath, file)));
    } catch (err) {
      throw new Error(`[error] App "${appId}": Failed to read gallery image "${file}": ${err.message}`);
    }
    if (!dimensions.width || !dimensions.height) {
      throw new Error(`[error] App "${appId}": Unable to read dimensions of gallery image "${file}".`);
    }
    return { file, width: dimensions.width, height: dimensions.height };
  });
}

for (const appId of appFolders) {
  const appPath = path.join(APPS_DIR, appId);
  const manifestPath = path.join(appPath, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    console.warn(`[warn] Skipping ${appId}: Missing manifest.json`);
    continue;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  // Ajv 2020-12 Schema Validation
  const isValid = validateManifest(manifest);
  if (!isValid) {
    console.error("[error] Schema validation errors for " + appId + ":", validateManifest.errors);
    for (const err of validateManifest.errors || []) {
      if (err.instancePath.includes("image") && err.keyword === "not") {
        console.error(`   Image policy violation: ${err.instancePath} cannot use ':latest' tag.`);
      }
    }
    throw new Error("Schema validation failed for " + appId);
  }

  // Check ID matches folder
  if (manifest.id !== appId) {
    throw new Error(`[error] App ID mismatch: folder is "${appId}" but manifest.id is "${manifest.id}"`);
  }

  // Check ID regex
  const idRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!idRegex.test(manifest.id)) {
    throw new Error(`[error] Invalid app ID "${manifest.id}". Must match kebab-case: ${idRegex}`);
  }

  // Check version immutability against base branch
  validateVersionImmutability(appId, manifest);

  // Check that manifest compatibility lower bound is at least the SDK version used
  validateAppSdkCompatibility(appId, appPath, manifest);

  // Check Docker Image reference policy (disallow :latest, require explicit tag or digest)
  const imageCandidates = [
    { key: "deploy.image", value: manifest.deploy?.image },
    { key: "image", value: manifest.image }
  ].filter((item) => item.value !== undefined && item.value !== null);

  if (imageCandidates.length === 0) {
    throw new Error(`[error] App "${appId}": manifest must specify a container image in "deploy.image"`);
  }

  for (const { key, value } of imageCandidates) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`[error] App "${appId}": "${key}" must be a non-empty string`);
    }

    // Strictly disallow :latest tag
    if (/:latest($|@)/.test(value)) {
      throw new Error(
        `[error] App "${appId}": ${key} ("${value}") cannot use :latest. ` +
        `Catalog apps must specify an immutable version tag (e.g. ":${manifest.version}") or sha256 digest.`
      );
    }

    // Untagged images default to :latest in Docker, which is disallowed
    const lastSlash = value.lastIndexOf("/");
    const repoAndTag = lastSlash === -1 ? value : value.substring(lastSlash + 1);
    if (!repoAndTag.includes(":") && !repoAndTag.includes("@")) {
      throw new Error(
        `[error] App "${appId}": ${key} ("${value}") is missing an explicit version tag or digest. ` +
        `Untagged images default to :latest, which is disallowed.`
      );
    }
  }

  // Auto-scan Icon & Readme files by convention
  const rasterIcons = ["icon.png", "icon.jpg", "icon.jpeg", "icon.webp"].filter(f => fs.existsSync(path.join(appPath, f)));
  if (rasterIcons.length > 0) {
    throw new Error(
      `[error] App "${appId}": Raster icons (${rasterIcons.join(", ")}) are not allowed. ` +
      `App icons must strictly be vector "icon.svg" to scale sharply across all FynnCloud UI surfaces.`
    );
  }

  const iconPath = path.join(appPath, "icon.svg");
  const hasIcon = fs.existsSync(iconPath);
  if (!hasIcon) {
    throw new Error(
      `[error] App "${appId}": Missing required "icon.svg". Every app must provide an "icon.svg" vector icon.`
    );
  }
  validateMonochromeSvg(iconPath, appId);
  const iconUrl = `/apps/${appId}/icon.svg`;
  const hasReadme = fs.existsSync(path.join(appPath, "README.md"));

  // Auto-scan Hero image by convention (16:9 .webp, .png, or .jpg)
  const heroFile = HERO_CANDIDATES.find(f => fs.existsSync(path.join(appPath, f))) || null;

  let heroDimensions = null;
  if (heroFile) {
    const heroPath = path.join(appPath, heroFile);
    let dimensions;
    try {
      dimensions = imageSize(fs.readFileSync(heroPath));
    } catch (err) {
      throw new Error(`[error] App "${appId}": Failed to read dimensions of hero image "${heroFile}": ${err.message}`);
    }

    const { width, height } = dimensions;
    if (!width || !height) {
      throw new Error(`[error] App "${appId}": Unable to read dimensions of hero image "${heroFile}".`);
    }

    if (width < 1280 || height < 720) {
      throw new Error(
        `[error] App "${appId}": Hero image "${heroFile}" is ${width}x${height}px. ` +
        `Hero images must be at least 1280x720 (recommended: 1920x1080).`
      );
    }

    const ratio = width / height;
    const targetRatio = 16 / 9;
    if (Math.abs(ratio - targetRatio) > 0.02) {
      throw new Error(
        `[error] App "${appId}": Hero image "${heroFile}" has aspect ratio ${ratio.toFixed(2)}:1 (${width}x${height}px). ` +
        `Hero images must have a 16:9 aspect ratio (e.g. 1920x1080 or 1280x720).`
      );
    }

    heroDimensions = { width, height };
    console.log(`     Validated 16:9 hero image (${width}x${height}px)`);
  }

  const heroUrl = heroFile ? `/apps/${appId}/${heroFile}` : null;

  // Gallery images by convention (gallery/*.png|jpg|jpeg|webp)
  const gallery = collectGallery(appPath, appId, manifest);
  if (gallery.length > 0) {
    console.log(`     Validated ${gallery.length} gallery image${gallery.length === 1 ? "" : "s"}`);
  }

  // Allowlist of files this app publishes
  publishedAssets.set(appId, [
    "manifest.json",
    "icon.svg",
    ...(hasReadme ? ["README.md"] : []),
    ...(heroFile ? [heroFile] : []),
    ...gallery.map((g) => `${GALLERY_DIR}/${g.file}`)
  ]);

  // Resolve immutable image digest from container registry
  const targetImage = manifest.deploy?.image || manifest.image;
  let resolvedImage = targetImage;
  let resolvedDigest = null;

  try {
    const res = await resolveImageDigest(targetImage, {
      githubToken: process.env.GITHUB_TOKEN
    });

    if (res?.digest) {
      resolvedImage = res.pinnedImage;
      resolvedDigest = res.digest;
      console.log(`     Resolved immutable digest: ${res.digest.substring(0, 19)}...`);
    } else {
      if (requireDigest) {
        throw new Error(
          `[error] App "${appId}": Could not resolve image digest from registry for "${targetImage}". ` +
          `Make sure the image has been pushed to the container registry and is publicly accessible.`
        );
      } else {
        console.warn(`     [warn] Could not resolve registry digest for ${targetImage} (keeping tag)`);
      }
    }
  } catch (err) {
    if (requireDigest) throw err;
    console.warn(`     [warn] Registry digest lookup failed: ${err.message}`);
  }

  // Release list: the working-tree manifest is the current release; earlier versions come from git history.
  const history = collectReleaseHistory(appId);
  const versions = [
    {
      version: manifest.version,
      released_at: history.get(manifest.version)?.released_at || null,
      compatibility: manifest.compatibility || null,
      image: resolvedImage,
      digest: resolvedDigest,
      manifest: {
        ...manifest,
        image: resolvedImage,
        deploy: manifest.deploy ? { ...manifest.deploy, image: resolvedImage } : undefined,
        digest: resolvedDigest || undefined
      }
    }
  ];
  const olderVersions = [...history.entries()]
    .filter(([version]) => version !== manifest.version)
    .sort((a, b) => semver.rcompare(a[0], b[0]))
    .slice(0, MAX_VERSIONS_PER_APP - 1);
  for (const [version, release] of olderVersions) {
    const old = release.manifest;
    const oldImage = old.deploy?.image || old.image;
    const pinned = await tryResolveDigest(oldImage);
    versions.push({
      version,
      released_at: release.released_at,
      compatibility: old.compatibility || null,
      image: pinned.image,
      digest: pinned.digest,
      manifest: {
        ...old,
        image: pinned.image,
        deploy: old.deploy ? { ...old.deploy, image: pinned.image } : undefined,
        digest: pinned.digest || undefined
      }
    });
  }
  versions.sort((a, b) => semver.rcompare(a.version, b.version));

  const appEntry = {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description || "",
    author: manifest.author || "FynnCloud Community",
    category: manifest.category || "productivity",
    icon: manifest.icon || null,
    icon_url: iconUrl,
    hero_url: heroUrl,
    hero_dimensions: heroDimensions,
    gallery: gallery.map((g) => `/apps/${appId}/${GALLERY_DIR}/${g.file}`),
    readme_url: hasReadme ? `/apps/${appId}/README.md` : null,
    gradient: manifest.gradient || "from-sky-500 to-indigo-600",
    iconColor: manifest.iconColor || "text-sky-100",
    image: resolvedImage,
    digest: resolvedDigest,
    deploy: manifest.deploy ? { ...manifest.deploy, image: resolvedImage } : null,
    ui: manifest.ui !== undefined ? manifest.ui : true,
    compatibility: manifest.compatibility,
    versions,
    permissions: manifest.permissions || [],
    hooks: manifest.hooks || {},
    manifest: {
      ...manifest,
      image: resolvedImage,
      deploy: manifest.deploy ? { ...manifest.deploy, image: resolvedImage } : undefined,
      digest: resolvedDigest || undefined
    }
  };

  catalog.apps.push(appEntry);
  const rangeDisplay = manifest.compatibility?.api_version || "unspecified";
  console.log(`  ${manifest.id} (v${manifest.version}) [${manifest.category}] API ${rangeDisplay}, ${versions.length} release${versions.length === 1 ? "" : "s"}`);
}

catalog.total_apps = catalog.apps.length;

if (!isDryRun) {
  // Start from a clean slate so files from earlier builds can never be published by accident
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, "schemas"), { recursive: true });
  fs.mkdirSync(path.join(DIST_DIR, "apps"), { recursive: true });

  // Write catalog index
  fs.writeFileSync(path.join(DIST_DIR, "index.json"), JSON.stringify(catalog, null, 2));

  // Copy Schema
  fs.copyFileSync(schemaPath, path.join(DIST_DIR, "schemas", "app-manifest-v1.json"));

  // Copy only allowlisted app assets (manifest, icon, README, hero, gallery images)
  for (const [appId, relPaths] of publishedAssets) {
    const srcDir = path.join(APPS_DIR, appId);
    const destDir = path.join(DIST_DIR, "apps", appId);
    for (const rel of relPaths) {
      const dest = path.join(destDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(srcDir, rel), dest);
    }
  }

  // Prevent Jekyll from ignoring files on GitHub Pages
  fs.writeFileSync(path.join(DIST_DIR, ".nojekyll"), "");

  console.log(`\nGenerated dist/index.json with ${catalog.total_apps} apps.`);
} else {
  console.log(`\nValidation successful for ${catalog.total_apps} apps (Dry Run).`);
}

