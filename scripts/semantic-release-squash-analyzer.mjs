import {
  aggregateReleaseTypeFromFullMessage,
  isReleaseBotCommit,
  maxReleaseType,
} from "./lib/aggregate-release-type.mjs";

/**
 * semantic-release plugin: resolve release type from squash (or normal) commits
 * by scanning every line of each commit message (title + body).
 */
export async function analyzeCommits(_pluginConfig, context) {
  const { commits, logger } = context;

  let releaseType = null;
  for (const { message, hash } of commits) {
    if (!message?.trim()) {
      logger.log("Skip commit %s with empty message", hash);
      continue;
    }
    if (isReleaseBotCommit(message)) {
      logger.log("Skip automated release commit %s", hash);
      continue;
    }

    const type = aggregateReleaseTypeFromFullMessage(message);
    if (type) {
      logger.log("Release type from commit %s body/lines: %s", hash, type);
      releaseType = maxReleaseType(releaseType, type);
    } else {
      logger.log("No release rule matched lines in commit %s", hash);
    }
  }

  if (releaseType) {
    logger.log("Combined release type: %s", releaseType);
  } else {
    logger.log("No release — no releasable conventional lines in commit messages");
  }
  return releaseType;
}

export default { analyzeCommits };
