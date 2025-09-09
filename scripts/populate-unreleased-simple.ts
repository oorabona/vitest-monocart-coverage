#!/usr/bin/env tsx
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

/**
 * Script to populate the [Unreleased] section with commits since the last tag
 * Handles multiple conventional commit prefixes within a single commit
 */

const CHANGELOG_PATH = "CHANGELOG.md";

interface CommitPart {
  type: string;
  scope?: string;
  description: string;
  sha: string;
}

/**
 * Extract all conventional commit patterns from a commit body
 * Handles messages like "feat: add X" in title and "fix: resolve Y" in body
 */
function extractConventionalCommitParts(commitBody: string, sha: string): CommitPart[] {
  const parts: CommitPart[] = [];
  
  // Pattern to match conventional commits: type(optional-scope): description
  const conventionalCommitRegex = /^(\w+)(?:\(([^)]+)\))?\s*:\s*(.+)$/gm;
  
  let match;
  while ((match = conventionalCommitRegex.exec(commitBody)) !== null) {
    const [, type, scope, description] = match;
    if (type && description && description.trim()) {
      parts.push({
        type: type.trim(),
        scope: scope?.trim(),
        description: description.trim(),
        sha
      });
    }
  }
  
  return parts;
}

/**
 * Parse git log output and extract all conventional commit parts
 */
function parseCommitsWithMultiplePrefixes(gitOutput: string): string {
  if (!gitOutput) return "";
  
  const commitEntries = gitOutput.split("|||END|||").filter(entry => entry.trim());
  const allParts: CommitPart[] = [];
  
  for (const entry of commitEntries) {
    const [sha, ...bodyParts] = entry.split("|");
    const body = bodyParts.join("|").trim();
    
    if (sha && body) {
      const shortSha = sha.substring(0, 7);
      const parts = extractConventionalCommitParts(body, shortSha);
      
      if (parts.length === 0) {
        // No conventional patterns found, treat the first line as a generic entry
        const firstLine = body.split('\n')[0].trim();
        if (firstLine) {
          allParts.push({
            type: 'misc',
            description: firstLine,
            sha: shortSha
          });
        }
      } else {
        allParts.push(...parts);
      }
    }
  }
  
  // Group by type and format
  const groupedParts: Record<string, CommitPart[]> = {};
  
  for (const part of allParts) {
    const sectionName = normalizeCommitType(part.type);
    if (!groupedParts[sectionName]) {
      groupedParts[sectionName] = [];
    }
    groupedParts[sectionName].push(part);
  }
  
  // Format to changelog
  const sections: string[] = [];
  const sectionOrder = ["### Added", "### Fixed", "### Changed", "### Removed", "### Security"];
  
  for (const sectionTitle of sectionOrder) {
    if (groupedParts[sectionTitle] && groupedParts[sectionTitle].length > 0) {
      sections.push(sectionTitle);
      sections.push(...groupedParts[sectionTitle].map(part => 
        `- ${part.description}${part.scope ? ` (${part.scope})` : ""} (${part.sha})`
      ));
      sections.push(""); // Empty line between sections
    }
  }
  
  return sections.length > 0 ? sections.join('\n').trim() : "No changes yet.";
}

/**
 * Normalize commit types to standard changelog categories
 */
function normalizeCommitType(type: string): string {
  const typeMap: Record<string, string> = {
    feat: "### Added",
    feature: "### Added",
    add: "### Added",
    fix: "### Fixed",
    bugfix: "### Fixed",
    perf: "### Changed",
    refactor: "### Changed",
    style: "### Changed",
    docs: "### Changed",
    test: "### Changed",
    chore: "### Changed",
    build: "### Changed",
    ci: "### Changed",
    misc: "### Changed"
  };
  
  return typeMap[type.toLowerCase()] || "### Changed";
}

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

  // Get commit data (SHA and full body) since the latest tag
  const gitLogCommand = latestTag 
    ? `git log --pretty=format:"%H|%B|||END|||" ${latestTag}..HEAD`
    : `git log --pretty=format:"%H|%B|||END|||"`;
  
  let gitOutput: string;
  try {
    gitOutput = execSync(gitLogCommand, { encoding: "utf8" }).trim();
  } catch {
    console.log("ℹ️  No new commits found");
    gitOutput = "";
  }

  // Parse commits and extract all conventional commit parts
  const commits = parseCommitsWithMultiplePrefixes(gitOutput);

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