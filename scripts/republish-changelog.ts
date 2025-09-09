#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

/**
 * Get GitHub repository URL for commit links
 */
function getRepoUrl(): string {
  try {
    const remoteUrl = execSync("git config --get remote.origin.url", { encoding: "utf8" }).trim();
    // Convert git URL to https format and remove .git suffix
    return remoteUrl.replace(/^git@github\.com:/, "https://github.com/").replace(/\.git$/, "");
  } catch {
    // Fallback if git command fails
    return "https://github.com/oorabona/vitest-monocart-coverage";
  }
}

/**
 * Script specialized for republishing an existing version without bumping.
 * This handles the case where a Git tag exists but the package was never published to npm.
 * 
 * Unlike update-changelog.ts, this script:
 * - Uses the existing tag version from package.json
 * - Ensures the [Unreleased] section content gets moved to the correct version
 * - Handles the case where the version entry might already exist in changelog
 */

const changelogPath = join(process.cwd(), "CHANGELOG.md");

// Get version from package.json
let version: string;
try {
  const pkg = await import(join(process.cwd(), "package.json"), { with: { type: "json" } });
  version = pkg.default.version;
} catch (err) {
  console.error("❌ Failed to read version from package.json:", err);
  process.exit(1);
}

console.log(`ℹ️  Republishing version: ${version}`);

const date = new Date().toISOString().split("T")[0];
const tag = `v${version}`;
const repoUrl = getRepoUrl();

let changelog = readFileSync(changelogPath, "utf8");

// Find the [Unreleased] section
const unreleasedBlock = /^(?<prefix>[^\n]*?##\s*\[?Unreleased\]?[^\n]*\n)(?<content>[\s\S]*?)(?=^##\s|^\s*---\s*$|$(?![\s\S]))/im;
const match = changelog.match(unreleasedBlock);

if (!match || !match.groups) {
  console.error("❌ No [Unreleased] section found in CHANGELOG.md");
  process.exit(1);
}

const unreleasedContent = match.groups.content.trim();

// Check if version entry already exists
const versionExistsRegex = new RegExp(`^##\\s*\\[?${tag.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\]?`, 'im');
const versionExists = versionExistsRegex.test(changelog);

if (versionExists && !unreleasedContent) {
  console.log(`ℹ️  Version ${tag} already exists in changelog and [Unreleased] is empty. Nothing to do.`);
  process.exit(0);
}

if (versionExists && unreleasedContent) {
  console.log(`⚠️  Version ${tag} already exists in changelog but [Unreleased] has content.`);
  console.log(`ℹ️  Updating existing ${tag} entry with unreleased content...`);
  
  // Find and update the existing version entry
  const versionEntryRegex = new RegExp(
    `(^##\\s*\\[?${tag.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\]?[^\\n]*\\n)((?:[\\s\\S]*?)(?=^##\\s|^\\s*---\\s*$|$(?![\\s\\S])))`,
    'im'
  );
  
  const versionMatch = changelog.match(versionEntryRegex);
  if (versionMatch) {
    const newVersionContent = `${versionMatch[1]}\n${unreleasedContent}\n\n`;
    changelog = changelog.replace(versionEntryRegex, newVersionContent);
    
    // Clear the unreleased section
    changelog = changelog.replace(unreleasedBlock, `${match.groups.prefix}\n`);
  }
} else {
  // Standard case: move unreleased content to new version entry
  if (!unreleasedContent) {
    console.error("❌ [Unreleased] section is empty. Use populate-unreleased.ts first or add content manually.");
    process.exit(1);
  }
  
  console.log(`📝 Moving [Unreleased] content to ${tag} entry`);
  
  // Build the new version entry
  const newEntryLines: string[] = [];
  newEntryLines.push(`## [${tag}] - ${date}`);
  newEntryLines.push(""); // blank line before content
  newEntryLines.push(unreleasedContent);
  newEntryLines.push(""); // trailing blank line after the entry
  
  // Replace the unreleased block with empty unreleased + new version entry
  changelog = changelog.replace(
    unreleasedBlock,
    `${match.groups.prefix}\n${newEntryLines.join("\n")}\n`,
  );
}

// Update/add reference links
let linkLine: string;
let unreleasedLine: string;

if (repoUrl.includes("github.com")) {
  linkLine = `[${tag}]: ${repoUrl}/releases/tag/${tag}`;
  unreleasedLine = `[Unreleased]: ${repoUrl}/compare/${tag}...HEAD`;
} else if (repoUrl.includes("gitlab")) {
  linkLine = `[${tag}]: ${repoUrl}/-/tags/${tag}`;
  unreleasedLine = `[Unreleased]: ${repoUrl}/-/compare/${tag}...HEAD`;
} else {
  linkLine = `[${tag}]: ${repoUrl}`;
  unreleasedLine = `[Unreleased]: ${repoUrl}`;
}

const lines = changelog.split(/\r?\n/);
let foundUnreleasedLink = false;
let foundTagLink = false;

for (let i = 0; i < lines.length; i++) {
  const ln = lines[i];
  if (/^\[Unreleased\]:/i.test(ln)) {
    lines[i] = unreleasedLine;
    foundUnreleasedLink = true;
  }
  if (new RegExp(`^\\[${tag.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}]:`, 'i').test(ln)) {
    lines[i] = linkLine;
    foundTagLink = true;
  }
}

if (!foundUnreleasedLink) {
  lines.push(unreleasedLine);
}
if (!foundTagLink) {
  lines.push(linkLine);
}

changelog = lines.join("\n");

writeFileSync(changelogPath, changelog, "utf8");
console.log(`✅ CHANGELOG.md updated for republish of ${tag} (${repoUrl})`);