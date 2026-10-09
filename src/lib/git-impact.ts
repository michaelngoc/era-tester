import "server-only";
import micromatch from "micromatch";
import { query } from "./db";
import { sendGitPushImpactEmail } from "./mailer";

export interface GitCommitPayload {
  commitHash: string;
  commitMessage: string;
  authorName: string;
  authorEmail: string;
  branch: string;
  modifiedFiles: string[];
}

export async function processGitPushImpact(payload: GitCommitPayload) {
  const { commitHash, commitMessage, authorName, branch, modifiedFiles } = payload;

  // 1. Fetch all modules and their file_patterns
  const modulesRes = await query<{
    id: number;
    project_id: number;
    name: string;
    file_patterns: string[];
  }>("SELECT id, project_id, name, file_patterns FROM era_tester_modules");

  const impactedModules: Array<{
    id: number;
    name: string;
    projectId: number;
    matchedFiles: string[];
  }> = [];

  for (const mod of modulesRes.rows) {
    const patterns = mod.file_patterns || [];
    if (patterns.length === 0) continue;

    const matched = micromatch(modifiedFiles, patterns);
    if (matched.length > 0) {
      impactedModules.push({
        id: mod.id,
        name: mod.name,
        projectId: mod.project_id,
        matchedFiles: matched,
      });
    }
  }

  // 2. Mark test cases in impacted modules as needing re-test
  if (impactedModules.length > 0) {
    const moduleIds = impactedModules.map((m) => m.id);
    await query(
      `UPDATE era_tester_cases 
       SET is_impacted_by_git = TRUE, updated_at = NOW() 
       WHERE module_id = ANY($1::int[])`,
      [moduleIds]
    );

    // 3. Save git log to database
    await query(
      `INSERT INTO era_tester_git_logs 
       (project_id, branch, commit_hash, commit_message, author_name, author_email, modified_files, impacted_modules)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        impactedModules[0].projectId,
        branch,
        commitHash,
        commitMessage,
        authorName,
        payload.authorEmail,
        modifiedFiles,
        JSON.stringify(impactedModules),
      ]
    );

    // 4. Find all active Testers/Members to notify
    const usersRes = await query<{ email: string }>(
      "SELECT email FROM era_tester_users WHERE status = 'ACTIVE'"
    );
    const recipients = usersRes.rows.map((u) => u.email).filter(Boolean);

    if (recipients.length > 0) {
      await sendGitPushImpactEmail({
        recipients,
        commitHash,
        commitMessage,
        author: authorName,
        branch,
        impactedModules,
      });
    }
  }

  return {
    impactedCount: impactedModules.length,
    impactedModules,
  };
}
