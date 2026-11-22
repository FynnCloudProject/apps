/**
 * Resolves and verifies the immutable sha256 digest for an image reference using the
 * standard OCI / Docker Registry v2 API (anonymously, matching how FynnCloud pulls apps).
 * Supports GHCR (ghcr.io), Docker Hub (docker.io), Quay, and self-hosted registries.
 *
 * Throws an Error with a clear reason if the image cannot be found, is private/unauthorized,
 * or the registry request fails.
 */

const ACCEPT_HEADERS = [
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.v2+json"
].join(", ");

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function parseImageRef(imageRef) {
  let registry = "registry-1.docker.io";
  let namePart = imageRef.trim();
  let reference = "latest";
  let alreadyPinned = false;

  const atIdx = namePart.indexOf("@");
  if (atIdx !== -1) {
    reference = namePart.substring(atIdx + 1);
    namePart = namePart.substring(0, atIdx);
    alreadyPinned = true;
    // Strip optional :tag from namePart when both tag and digest are present (repo:tag@sha256:...)
    const colonIdx = namePart.lastIndexOf(":");
    const slashIdx = namePart.lastIndexOf("/");
    if (colonIdx > slashIdx) {
      namePart = namePart.substring(0, colonIdx);
    }
  } else {
    const colonIdx = namePart.lastIndexOf(":");
    const slashIdx = namePart.lastIndexOf("/");
    if (colonIdx > slashIdx) {
      reference = namePart.substring(colonIdx + 1);
      namePart = namePart.substring(0, colonIdx);
    }
  }

  let repo = namePart;
  const firstSlash = repo.indexOf("/");
  if (firstSlash !== -1) {
    const domain = repo.substring(0, firstSlash);
    if (domain.includes(".") || domain.includes(":") || domain === "localhost") {
      registry = domain;
      repo = repo.substring(firstSlash + 1);
    }
  }

  if (registry === "docker.io" || registry === "registry-1.docker.io") {
    registry = "registry-1.docker.io";
    if (!repo.includes("/")) {
      repo = `library/${repo}`;
    }
  }

  return { registry, repo, reference, alreadyPinned };
}

async function fetchManifest(manifestUrl, repo, timeoutMs) {
  const headers = { Accept: ACCEPT_HEADERS };

  let res = await fetch(manifestUrl, {
    method: "HEAD",
    headers,
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (res.status === 401) {
    const authHeader = res.headers.get("www-authenticate");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const realmMatch = authHeader.match(/realm="([^"]+)"/);
      const serviceMatch = authHeader.match(/service="([^"]+)"/);
      const scopeMatch = authHeader.match(/scope="([^"]+)"/);

      if (realmMatch) {
        const authUrl = new URL(realmMatch[1]);
        if (serviceMatch) authUrl.searchParams.set("service", serviceMatch[1]);
        if (scopeMatch) authUrl.searchParams.set("scope", scopeMatch[1]);
        else authUrl.searchParams.set("scope", `repository:${repo}:pull`);

        // Request an anonymous pull token so we verify the image is publicly pullable
        // without relying on CI credentials.
        const tokenRes = await fetch(authUrl.toString(), {
          signal: AbortSignal.timeout(timeoutMs)
        });

        if (!tokenRes.ok) {
          throw new Error(
            `Registry token request failed (HTTP ${tokenRes.status}) — image may be private or non-existent`
          );
        }

        const tokenData = await tokenRes.json();
        const token = tokenData.token || tokenData.access_token;
        if (!token) {
          throw new Error("Registry token endpoint did not return an access token");
        }

        headers["Authorization"] = `Bearer ${token}`;
        res = await fetch(manifestUrl, {
          method: "HEAD",
          headers,
          signal: AbortSignal.timeout(timeoutMs)
        });
      }
    }
  }

  if (res.status === 405) {
    res = await fetch(manifestUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(timeoutMs)
    });
  }

  return res;
}

export async function resolveImageDigest(imageRef, options = {}) {
  const { timeoutMs = 15000, retries = 1 } = options;

  if (!imageRef || typeof imageRef !== "string") {
    throw new Error("Invalid image reference");
  }

  const { registry, repo, reference, alreadyPinned } = parseImageRef(imageRef);
  const manifestUrl = `https://${registry}/v2/${repo}/manifests/${reference}`;

  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchManifest(manifestUrl, repo, timeoutMs);

      if (!res.ok) {
        if (RETRYABLE_STATUSES.has(res.status) && attempt < retries) {
          lastError = new Error(`HTTP ${res.status} ${res.statusText}`);
          continue;
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            `Registry denied anonymous pull (HTTP ${res.status}) — ensure the image exists and is public`
          );
        }
        if (res.status === 404) {
          throw new Error(`Image or tag not found in registry (HTTP 404)`);
        }
        throw new Error(`Registry returned HTTP ${res.status} ${res.statusText}`.trim());
      }

      const headerDigest = res.headers.get("docker-content-digest");
      if (alreadyPinned) {
        if (headerDigest && headerDigest !== reference) {
          throw new Error(
            `Pinned digest mismatch: manifest specifies ${reference}, registry returned ${headerDigest}`
          );
        }
        return {
          pinnedImage: imageRef,
          digest: headerDigest || reference,
          alreadyPinned: true
        };
      }

      if (!headerDigest) {
        throw new Error("Registry response did not include a docker-content-digest header");
      }

      return {
        pinnedImage: `${imageRef}@${headerDigest}`,
        digest: headerDigest,
        alreadyPinned: false
      };
    } catch (err) {
      lastError = err;
      const isRetryableNetworkErr =
        err?.name === "TimeoutError" ||
        err?.name === "AbortError" ||
        err?.cause?.code === "ECONNRESET" ||
        err?.cause?.code === "ETIMEDOUT";
      if (attempt < retries && isRetryableNetworkErr) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error(`Failed to resolve image digest for "${imageRef}"`);
}
