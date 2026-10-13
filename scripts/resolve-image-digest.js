/**
 * Resolves the immutable sha256 digest for an image reference using standard OCI / Docker Registry v2 API.
 * Supports GHCR (ghcr.io), Docker Hub (docker.io), Quay, and self-hosted registries.
 */
export async function resolveImageDigest(imageRef, options = {}) {
  const { githubToken = process.env.GITHUB_TOKEN, timeoutMs = 4000 } = options;

  if (!imageRef || typeof imageRef !== "string") {
    throw new Error("Invalid image reference");
  }

  // If already pinned with @sha256:digest, return as-is
  const atIdx = imageRef.indexOf("@");
  if (atIdx !== -1) {
    const digest = imageRef.substring(atIdx + 1);
    return {
      pinnedImage: imageRef,
      digest,
      alreadyPinned: true
    };
  }

  let registry = "registry-1.docker.io";
  let repo = imageRef;
  let tag = "latest";

  const colonIdx = repo.lastIndexOf(":");
  const slashIdx = repo.lastIndexOf("/");
  if (colonIdx > slashIdx) {
    tag = repo.substring(colonIdx + 1);
    repo = repo.substring(0, colonIdx);
  }

  const firstSlash = repo.indexOf("/");
  if (firstSlash !== -1) {
    const domain = repo.substring(0, firstSlash);
    if (domain.includes(".") || domain.includes(":")) {
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

  const manifestUrl = `https://${registry}/v2/${repo}/manifests/${tag}`;
  const acceptHeaders = "application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json";

  const headers = { "Accept": acceptHeaders };

  try {
    let res = await fetch(manifestUrl, { method: "HEAD", headers, signal: AbortSignal.timeout(timeoutMs) });

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

          const authHeaders = {};
          if (registry === "ghcr.io" && githubToken) {
            authHeaders["Authorization"] = `Bearer ${githubToken}`;
          }

          const tokenRes = await fetch(authUrl.toString(), { headers: authHeaders, signal: AbortSignal.timeout(timeoutMs) });
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            const token = tokenData.token || tokenData.access_token;
            if (token) {
              headers["Authorization"] = `Bearer ${token}`;
              res = await fetch(manifestUrl, { method: "HEAD", headers, signal: AbortSignal.timeout(timeoutMs) });
            }
          }
        }
      }
    }

    const digest = res.headers.get("docker-content-digest");
    if (!digest) {
      return null;
    }

    return {
      pinnedImage: `${imageRef}@${digest}`,
      digest,
      alreadyPinned: false
    };
  } catch (err) {
    return null;
  }
}
