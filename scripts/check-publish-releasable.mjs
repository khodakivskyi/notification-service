#!/usr/bin/env node
/**
 * Shared gate for publish: ensure there is at least one releasable conventional line.
 *
 * Usage:
 *   node scripts/check-publish-releasable.mjs last-commit
 *   node scripts/check-publish-releasable.mjs range <git-rev-range>
 *
 * Examples:
 *   node scripts/check-publish-releasable.mjs last-commit
 *   node scripts/check-publish-releasable.mjs range origin/publish..HEAD
 */
import { execSync } from "node:child_process";
import {
  aggregateReleaseTypeFromCommits,
  aggregateReleaseTypeFromFullMessage,
  isReleaseBotCommit,
} from "./lib/aggregate-release-type.mjs";

const mode = process.argv[2];
const rangeArg = process.argv[3];

function git(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();
}

if (mode === "last-commit") {
  const message = git("git log -1 --format=%B");
  if (isReleaseBotCommit(message)) {
    process.exit(0);
  }
  const t = aggregateReleaseTypeFromFullMessage(message);
  if (!t) {
    console.error(
      "Publish head must include at least one releasable line in the squash message body " +
        "(e.g. * feat: …, * fix: …) or a conventional subject; " +
        "see docs in workflow Release."
    );
    process.exit(1);
  }
  process.exit(0);
}

if (mode === "range") {
  if (!rangeArg) {
    console.error("Missing range, e.g. origin/publish..HEAD");
    process.exit(1);
  }
  const raw = git(
    `git log --no-merges ${rangeArg} --format=%B---PUBLISH-GITLOG---`
  );
  const messages = raw
    .split("---PUBLISH-GITLOG---")
    .map((s) => s.trim())
    .filter(Boolean);

  const commits = messages.map((message) => ({ message }));
  const t = aggregateReleaseTypeFromCommits(commits);
  if (!t) {
    console.error(
      "This PR has no commits (or squash preview) that contain releasable conventional lines " +
        "(feat / fix / perf / refactor / docs / revert). " +
        "Use conventional commits on master so they appear in the squash body."
    );
    process.exit(1);
  }
  process.exit(0);
}

console.error("Usage: last-commit | range <git-rev-range>");
process.exit(2);
