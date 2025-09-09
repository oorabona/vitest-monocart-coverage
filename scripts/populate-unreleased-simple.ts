#!/usr/bin/env tsx
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

/**
 * Script to populate the [Unreleased] section with commits since the last tag
 * Uses a simple format: - commit message (short SHA)
 */

const CHANGELOG_PATH = "CHANGELOG.md";

try {
  console.log("📝 Populating [Unreleased] section...");

  // Get the latest tag
  let latestTag: string;
  try {
    latestTag = execSync("git describe --tags --abbrev=0 2>/dev/null", { encoding: "utf8" }).trim();
    console.log(`ℹ️  Latest tag: ${latestTag}`);
  } catch {
    console.log("ℹ️  No tags found, using all commits");
    latestTag = "";
  }

  // Get commits since the latest tag
  const gitLogCommand = latestTag 
    ? `git log --pretty=format:"- %s (%h)" ${latestTag}..HEAD`
    : `git log --pretty=format:"- %s (%h)"`;
  
  let commits: string;
  try {
    commits = execSync(gitLogCommand, { encoding: "utf8" }).trim();
  } catch {
    console.log("ℹ️  No new commits found");
    commits = "";
  }

  // Read the current changelog
  let changelog = readFileSync(CHANGELOG_PATH, "utf8");

  // Prepare the unreleased content
  const unreleasedContent = commits || "No changes yet.";
  
  // Replace the [Unreleased] section
  const unreleasedRegex = /## \[Unreleased\][\s\S]*?(?=## \[|$)/;
  const newUnreleasedSection = `## [Unreleased]\n\n${unreleasedContent}\n\n`;

  if (changelog.match(unreleasedRegex)) {
    changelog = changelog.replace(unreleasedRegex, newUnreleasedSection);
  } else {
    // Add Unreleased section after the header if it doesn't exist
    const headerEnd = changelog.indexOf('\n\n') + 2;
    changelog = changelog.slice(0, headerEnd) + newUnreleasedSection + changelog.slice(headerEnd);
  }

  // Write the updated changelog
  writeFileSync(CHANGELOG_PATH, changelog);

  const commitCount = commits ? commits.split('\n').length : 0;
  console.log(`✅ Updated [Unreleased] section with ${commitCount} commit(s)`);

} catch (error) {
  console.error("❌ Failed to populate [Unreleased] section:", error);
  process.exit(1);
}