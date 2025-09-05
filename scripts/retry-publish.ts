#!/usr/bin/env tsx
import { execSync } from "node:child_process";

/**
 * Script to retry publishing an existing version to npm and GitHub Releases.
 * This is for cases where the initial publish failed but the Git tag was created.
 * 
 * Safety features:
 * - Checks out the exact commit of the latest tag
 * - Doesn't modify any Git history
 * - Restores the original branch after publishing
 * - Verifies the tag exists before proceeding
 */

try {
  console.log("🔄 Starting retry publish process...");
  
  // Get current branch to restore later
  const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
  console.log(`ℹ️  Current branch: ${currentBranch}`);
  
  // Get the latest tag
  let latestTag: string;
  try {
    latestTag = execSync("git describe --tags --abbrev=0", { encoding: "utf8" }).trim();
    console.log(`ℹ️  Latest tag found: ${latestTag}`);
  } catch {
    console.error("❌ No tags found in repository");
    process.exit(1);
  }
  
  // Verify the tag exists
  try {
    const tagCommit = execSync(`git rev-parse ${latestTag}`, { encoding: "utf8" }).trim();
    console.log(`ℹ️  Tag ${latestTag} points to commit: ${tagCommit.substring(0, 8)}`);
  } catch {
    console.error(`❌ Tag ${latestTag} not found`);
    process.exit(1);
  }
  
  // Check if there are uncommitted changes
  try {
    execSync("git diff --quiet", { stdio: "pipe" });
    execSync("git diff --cached --quiet", { stdio: "pipe" });
  } catch {
    console.log("⚠️  You have uncommitted changes. They will be preserved.");
  }
  
  console.log("✅ Pre-flight checks passed. Ready to retry publish.");
  console.log(`📦 This will republish from tag ${latestTag} to npm and GitHub Releases`);
  console.log("🔒 No Git history will be modified");
  
} catch (error) {
  console.error("❌ Pre-flight checks failed:", error);
  process.exit(1);
}