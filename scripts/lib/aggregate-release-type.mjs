/** Rules aligned with .releaserc.json (squash body + subject lines). */

const PATCH_TYPES = new Set(["fix", "perf", "refactor", "docs", "revert"]);

/** GitHub squash / list lines: strip bullets and bold markers. */
export function normalizeSquashLine(line) {
  let s = line.trim();
  s = s.replace(/^[*\-•]\s+/, "");
  s = s.replace(/\*\*/g, "");
  return s.trim();
}

export function isReleaseBotCommit(message) {
  const first = message.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  return first.trim().startsWith("chore(release):");
}

/**
 * Conventional header in a single line, including optional scope and breaking `!`.
 * Examples: feat: x, fix(api): y, feat!: z, chore: ignored if not in map.
 */
const HEADER_RE =
  /^(feat|fix|perf|refactor|docs|revert|chore|ci|test|style|build)(\([^)]*\))?(!)?:\s*(.+)$/i;

export function releaseTypeForLine(line) {
  const normalized = normalizeSquashLine(line);
  const m = normalized.match(HEADER_RE);
  if (!m) return null;
  const type = m[1].toLowerCase();
  const breaking = m[3] === "!";
  if (breaking) return "major";
  if (type === "feat") return "minor";
  if (PATCH_TYPES.has(type)) return "patch";
  return null;
}

export function hasBreakingChangeFooter(text) {
  return /\bBREAKING[- ]CHANGE\b\s*:/i.test(text);
}

const RANK = { major: 3, minor: 2, patch: 1 };

export function maxReleaseType(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  return RANK[a] >= RANK[b] ? a : b;
}

/**
 * One full git message (squash subject + body, or a normal commit).
 */
export function aggregateReleaseTypeFromFullMessage(message) {
  if (!message?.trim()) return null;
  if (isReleaseBotCommit(message)) return null;
  if (hasBreakingChangeFooter(message)) return "major";

  let best = null;
  for (const rawLine of message.split(/\r?\n/)) {
    const t = releaseTypeForLine(rawLine);
    best = maxReleaseType(best, t);
  }
  return best;
}

export function aggregateReleaseTypeFromCommits(commits) {
  let best = null;
  for (const { message } of commits) {
    best = maxReleaseType(best, aggregateReleaseTypeFromFullMessage(message));
  }
  return best;
}
