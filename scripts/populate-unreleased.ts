#!/usr/bin/env tsx
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Script to populate the [Unreleased] section of CHANGELOG.md with commits
 * since the last tag. This runs before update-changelog.ts to ensure there's
 * always content in the Unreleased section.
 */

const changelogPath = join(process.cwd(), "CHANGELOG.md");

try {
  let changelog = readFileSync(changelogPath, "utf8");
  
  // Find the [Unreleased] section using the same regex as update-changelog.ts
  const unreleasedBlock = /^(?<prefix>[^\n]*?##\s*\[?Unreleased\]?[^\n]*\n)(?<content>[\s\S]*?)(?=^##\s|^\s*---\s*$|$(?![\s\S]))/im;
  const match = changelog.match(unreleasedBlock);
  
  if (!match || !match.groups) {
    console.error("❌ No [Unreleased] section found in CHANGELOG.md");
    process.exit(1);
  }
  
  const existingContent = match.groups.content.trim();
  
  // Determine strategy based on existing content
  const hasManualContent = existingContent && !existingContent.includes("No notable changes");
  
  if (hasManualContent) {
    console.log("ℹ️  [Unreleased] section has manual content, checking for additional git commits...");
  } else {
    console.log("ℹ️  [Unreleased] section is empty, populating with recent commits...");
  }
  
  // Get the latest tag to determine commit range
  let latestTag: string;
  try {
    latestTag = execSync("git describe --tags --abbrev=0", { encoding: "utf8" }).trim();
  } catch {
    // No tags exist yet, get all commits
    latestTag = "";
  }
  
  // Get commits since the latest tag
  const gitLogCommand = latestTag 
    ? `git log --pretty=format:"- %s" ${latestTag}..HEAD`
    : `git log --pretty=format:"- %s"`;
  
  let commits: string;
  try {
    commits = execSync(gitLogCommand, { encoding: "utf8" }).trim();
  } catch (error) {
    console.error("❌ Failed to get git commits:", error);
    process.exit(1);
  }
  
  if (!commits) {
    if (hasManualContent) {
      console.log("ℹ️  No new git commits since last tag, keeping existing manual content");
      process.exit(0); // Keep existing content as-is
    } else {
      console.log("ℹ️  No new commits since last tag, adding placeholder");
      commits = "- No notable changes";
    }
  } else {
    // Filter out merge commits and dependency updates for cleaner changelog
    const commitLines = commits.split('\n');
    const filteredCommits = commitLines.filter(commit => {
      const line = commit.toLowerCase();
      return !line.includes('merge pull request') && 
             !line.includes('merge branch') &&
             !line.includes('bump ') &&
             !line.includes('update dependency');
    });
    
    if (filteredCommits.length === 0) {
      if (hasManualContent) {
        console.log("ℹ️  No notable git commits since last tag, keeping existing manual content");
        process.exit(0);
      } else {
        commits = "- No notable changes";
      }
    } else {
      // Group commits by conventional commit types if they follow the pattern
      const groupedCommits = groupCommitsByType(filteredCommits);
      
      if (Object.keys(groupedCommits).length > 0) {
        commits = formatGroupedCommits(groupedCommits);
      } else {
        commits = filteredCommits.join('\n');
      }
    }
  }
  
  let newContent: string;
  
  if (hasManualContent) {
    // Merge manual content with git commits, avoiding duplication
    console.log(`📝 Merging existing manual content with ${commits.split('\n').length} git commit(s)`);
    
    // Smart merge: append git commits to existing sections or create new ones
    const gitCommitLines = commits.split('\n');
    const manualLines = existingContent.split('\n');
    
    // If manual content has sections (### Added, ### Fixed, etc.), try to merge intelligently
    if (existingContent.includes('### ') && commits.includes('### ')) {
      newContent = `${match.groups.prefix}${mergeChangelogSections(existingContent, commits)}\n\n`;
    } else {
      // Simple append with separator for raw commits
      const separator = existingContent.includes('### ') ? '\n\n### Additional Changes from Git\n' : '\n\n';
      newContent = `${match.groups.prefix}${existingContent}${separator}${commits}\n\n`;
    }
  } else {
    // Replace empty section with git commits only
    console.log(`📝 Adding ${commits.split('\n').length} commit(s) to [Unreleased] section`);
    newContent = `${match.groups.prefix}${commits}\n\n`;
  }
  
  changelog = changelog.replace(unreleasedBlock, newContent);
  
  writeFileSync(changelogPath, changelog, "utf8");
  console.log("✅ Successfully populated [Unreleased] section");
  
} catch (error) {
  console.error("❌ Failed to populate changelog:", error);
  process.exit(1);
}

/**
 * Group commits by conventional commit type (feat, fix, chore, etc.)
 */
function groupCommitsByType(commits: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  
  for (const commit of commits) {
    const match = commit.match(/^- (\w+)(?:\(.+\))?: (.+)$/);
    if (match) {
      const [, type, description] = match;
      const normalizedType = normalizeCommitType(type);
      if (normalizedType) {
        if (!groups[normalizedType]) {
          groups[normalizedType] = [];
        }
        groups[normalizedType].push(`- ${description}`);
      }
    }
  }
  
  return groups;
}

/**
 * Normalize commit types to standard changelog categories
 */
function normalizeCommitType(type: string): string | null {
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
    chore: "### Changed",
    test: "### Changed",
    ci: "### Changed",
    build: "### Changed"
  };
  
  return typeMap[type.toLowerCase()] || null;
}

/**
 * Format grouped commits into changelog sections
 */
function formatGroupedCommits(groups: Record<string, string[]>): string {
  const sections: string[] = [];
  
  // Order sections by priority
  const sectionOrder = ["### Added", "### Fixed", "### Changed"];
  
  for (const sectionTitle of sectionOrder) {
    if (groups[sectionTitle] && groups[sectionTitle].length > 0) {
      sections.push(sectionTitle);
      sections.push(...groups[sectionTitle]);
      sections.push(""); // Empty line between sections
    }
  }
  
  return sections.join('\n').trim();
}

/**
 * Merge manual changelog sections with git-generated sections
 */
function mergeChangelogSections(manualContent: string, gitContent: string): string {
  const manualSections = parseChangelogSections(manualContent);
  const gitSections = parseChangelogSections(gitContent);
  
  // Merge sections, manual takes priority for organization
  const mergedSections: Record<string, string[]> = { ...manualSections };
  
  // Append git items to corresponding sections
  for (const [sectionName, gitItems] of Object.entries(gitSections)) {
    if (mergedSections[sectionName]) {
      // Filter out potential duplicates based on similar text
      const newItems = gitItems.filter(gitItem => 
        !mergedSections[sectionName].some(manualItem => 
          areSimilarChangelogItems(manualItem, gitItem)
        )
      );
      mergedSections[sectionName].push(...newItems);
    } else {
      mergedSections[sectionName] = gitItems;
    }
  }
  
  // Format back to text
  const sections: string[] = [];
  const sectionOrder = ["### Added", "### Fixed", "### Changed", "### Removed", "### Security"];
  
  for (const sectionTitle of sectionOrder) {
    if (mergedSections[sectionTitle] && mergedSections[sectionTitle].length > 0) {
      sections.push(sectionTitle);
      sections.push(...mergedSections[sectionTitle]);
      sections.push(""); // Empty line between sections
    }
  }
  
  return sections.join('\n').trim();
}

/**
 * Parse changelog content into sections
 */
function parseChangelogSections(content: string): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  const lines = content.split('\n');
  let currentSection = '';
  
  for (const line of lines) {
    if (line.startsWith('### ')) {
      currentSection = line;
      sections[currentSection] = [];
    } else if (line.startsWith('- ') && currentSection) {
      sections[currentSection].push(line);
    }
  }
  
  return sections;
}

/**
 * Check if two changelog items are similar (to avoid duplication)
 */
function areSimilarChangelogItems(item1: string, item2: string): boolean {
  // Simple similarity check - could be enhanced with fuzzy matching
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const norm1 = normalize(item1);
  const norm2 = normalize(item2);
  
  return norm1.includes(norm2) || norm2.includes(norm1);
}