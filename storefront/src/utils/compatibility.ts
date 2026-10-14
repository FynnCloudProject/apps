function parseSemver(v: string): [number, number, number] | null {
  const clean = v.trim().replace(/^v/, '').split('-')[0]
  const parts = clean.split('.')
  if (parts.length !== 3) return null
  const nums = parts.map((p) => Number(p))
  if (nums.some((n) => !Number.isInteger(n) || n < 0)) return null
  return nums as [number, number, number]
}

function compareSemver(a: [number, number, number], b: [number, number, number]): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1
  }
  return 0
}

/**
 * Evaluates whether `hostVersion` (e.g. "0.1.0") satisfies a manifest `api_version`
 * comparator range (e.g. ">=0.1.0 <0.2.0"). Returns `null` when either is absent.
 */
export function isApiCompatible(
  range: string | null | undefined,
  hostVersion: string | null | undefined
): boolean | null {
  if (!range || !hostVersion) return null
  const host = parseSemver(hostVersion)
  if (!host) return null

  const tokens = range.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return null

  for (const token of tokens) {
    const match = token.match(/^(>=|<=|>|<|=)?(\d+\.\d+\.\d+)$/)
    if (!match) return false
    const op = match[1] || '='
    const target = parseSemver(match[2])
    if (!target) return false

    const cmp = compareSemver(host, target)
    if (op === '>=' && cmp < 0) return false
    if (op === '>' && cmp <= 0) return false
    if (op === '<=' && cmp > 0) return false
    if (op === '<' && cmp >= 0) return false
    if (op === '=' && cmp !== 0) return false
  }

  return true
}

