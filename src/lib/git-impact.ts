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
  repoFullName?: string;
}

export async function processGitPushImpact(payload: GitCommitPayload) {
  const { commitHash, commitMessage, authorName, branch, modifiedFiles, repoFullName } = payload;

  // 1. Xác định Project tương ứng từ repository full_name (nếu có)
  let targetProjectId: number | null = null;
  if (repoFullName) {
    const cleanRepo = repoFullName.trim().replace(/\.git$/, "");
    const projRes = await query<{ id: number; name: string }>(
      `SELECT id, name FROM era_tester_projects 
       WHERE LOWER(github_repo) = LOWER($1) 
          OR LOWER(github_repo) = LOWER($2)
       LIMIT 1`,
      [cleanRepo, repoFullName]
    );
    if (projRes.rows.length > 0) {
      targetProjectId = projRes.rows[0].id;
    }
  }

  // 2. Fetch các modules (lọc theo project nếu xác định được, hoặc toàn bộ)
  let modulesSql = `SELECT id, project_id, name, file_patterns, assigned_testers FROM era_tester_modules`;
  const modulesParams: any[] = [];
  if (targetProjectId) {
    modulesSql += ` WHERE project_id = $1`;
    modulesParams.push(targetProjectId);
  }

  const modulesRes = await query<{
    id: number;
    project_id: number;
    name: string;
    file_patterns: string[];
    assigned_testers: number[];
  }>(modulesSql, modulesParams);

  const impactedModules: Array<{
    id: number;
    name: string;
    projectId: number;
    matchedFiles: string[];
    assignedTesters: number[];
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
        assignedTesters: mod.assigned_testers || [],
      });
    }
  }

  // 3. Đánh dấu test cases trong các module bị ảnh hưởng và tự động gán tester phụ trách
  if (impactedModules.length > 0) {
    const moduleIds = impactedModules.map((m) => m.id);

    // Bật cờ is_impacted_by_git cho toàn bộ testcases thuộc các module này
    await query(
      `UPDATE era_tester_cases 
       SET is_impacted_by_git = TRUE, updated_at = NOW() 
       WHERE module_id = ANY($1::int[])`,
      [moduleIds]
    );

    // Với mỗi module có cấu hình assigned_testers: nếu test case chưa được ai nhận, tự động gán cho Tester đầu tiên
    for (const mod of impactedModules) {
      if (mod.assignedTesters && mod.assignedTesters.length > 0) {
        const primaryTesterId = mod.assignedTesters[0];
        await query(
          `UPDATE era_tester_cases 
           SET assigned_to = COALESCE(assigned_to, $1), updated_at = NOW()
           WHERE module_id = $2 AND assigned_to IS NULL`,
          [primaryTesterId, mod.id]
        );
      }
    }

    // 4. Lưu git log vào database
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

    // 5. Tập hợp danh sách Tester nhận email thông báo
    // Ưu tiên: Các tester được cấu hình phụ trách các module bị ảnh hưởng
    const specificTesterIds = new Set<number>();
    impactedModules.forEach((m) => {
      (m.assignedTesters || []).forEach((tid) => specificTesterIds.add(tid));
    });

    let recipients: string[] = [];
    if (specificTesterIds.size > 0) {
      const specificUsersRes = await query<{ email: string }>(
        `SELECT email FROM era_tester_users 
         WHERE status = 'ACTIVE' AND id = ANY($1::int[])`,
        [Array.from(specificTesterIds)]
      );
      recipients = specificUsersRes.rows.map((u) => u.email).filter(Boolean);
    }

    // Nếu các module chưa được gán tester riêng, gửi cho tất cả tester & admin đang hoạt động
    if (recipients.length === 0) {
      const allUsersRes = await query<{ email: string }>(
        "SELECT email FROM era_tester_users WHERE status = 'ACTIVE' AND role IN ('TESTER', 'SUPER_ADMIN')"
      );
      recipients = allUsersRes.rows.map((u) => u.email).filter(Boolean);
    }

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
