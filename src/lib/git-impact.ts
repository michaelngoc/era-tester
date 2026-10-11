import "server-only";
import micromatch from "micromatch";
import { query } from "./db";
import { sendGitPushImpactEmail } from "./mailer";
import { extractCaseIds, isTesterNotifyCommit } from "./commit-types";

export interface GitCommitInfo {
  hash: string;
  message: string;
  authorName: string;
  authorEmail: string;
  files: string[];
}

export interface GitPushPayload {
  /** Thứ tự cũ -> mới (đúng như GitHub push payload). */
  commits: GitCommitInfo[];
  branch: string;
  repoFullName?: string;
}

export async function processGitPushImpact(payload: GitPushPayload) {
  const { branch, repoFullName } = payload;

  // Chỉ commit có type feat/fix/perf/refactor mới được gửi cho Tester (xem commit-types.ts).
  const relevantCommits = payload.commits.filter((c) => isTesterNotifyCommit(c.message));
  if (relevantCommits.length === 0) {
    return {
      impactedCount: 0,
      impactedModules: [],
      referencedCases: [] as number[],
      activeRunId: null,
      skippedCommits: payload.commits.length,
    };
  }

  const headCommit = relevantCommits[relevantCommits.length - 1];
  const commitHash = headCommit.hash;
  const commitMessage = headCommit.message;
  const authorName = headCommit.authorName;
  const authorEmail = headCommit.authorEmail;
  const modifiedFiles = Array.from(new Set(relevantCommits.flatMap((c) => c.files)));

  // 1. Xác định Project tương ứng từ repository full_name
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

  // 2. Tìm hoặc tạo Đợt Test Hàng Ngày (Daily Incremental Test Run) nếu có targetProjectId
  let activeRunId: number | null = null;
  if (targetProjectId) {
    const todayStr = new Date().toLocaleDateString("vi-VN");
    const existingRunRes = await query<{ id: number }>(
      `SELECT id FROM era_tester_runs 
       WHERE project_id = $1 
         AND run_type = 'DAILY_INCREMENTAL' 
         AND status = 'IN_PROGRESS' 
         AND created_at::date = CURRENT_DATE
       ORDER BY id DESC LIMIT 1`,
      [targetProjectId]
    );

    if (existingRunRes.rows.length > 0) {
      activeRunId = existingRunRes.rows[0].id;
      // Cập nhật commit hash mới nhất
      await query(
        `UPDATE era_tester_runs 
         SET git_commit_hash = $1, git_commit_message = $2, git_author = $3
         WHERE id = $4`,
        [commitHash, commitMessage, authorName, activeRunId]
      );
    } else {
      const newRunRes = await query<{ id: number }>(
        `INSERT INTO era_tester_runs 
         (project_id, title, run_type, git_commit_hash, git_commit_message, git_author, status)
         VALUES ($1, $2, 'DAILY_INCREMENTAL', $3, $4, $5, 'IN_PROGRESS')
         RETURNING id`,
        [
          targetProjectId,
          `Đợt Test Nhanh Hôm Nay (${todayStr})`,
          commitHash,
          commitMessage,
          authorName,
        ]
      );
      activeRunId = newRunRes.rows[0]?.id || null;
    }
  }

  // 3. Quét mã [#ID] / [case-ID] trong từng commit hợp lệ -> TỰ ĐỘNG CHUYỂN SANG VERIFY VÀ GHI AUDIT LOG
  const referencedCaseIds: number[] = [];
  for (const commit of relevantCommits) {
    for (const caseId of extractCaseIds(commit.message)) {
      if (!referencedCaseIds.includes(caseId)) referencedCaseIds.push(caseId);

      const caseRes = await query<{ id: number; status: string }>(
        `SELECT id, status FROM era_tester_cases WHERE id = $1 LIMIT 1`,
        [caseId]
      );
      if (caseRes.rows.length === 0) continue;
      const oldStatus = caseRes.rows[0].status;

      // Chuyển case sang VERIFY và gán cho Tester tạo kịch bản (nếu vẫn còn ACTIVE)
      await query(
        `UPDATE era_tester_cases c
         SET status = 'VERIFY', 
             is_impacted_by_git = TRUE,
             assigned_to = (
               SELECT CASE WHEN u.status = 'ACTIVE' THEN u.id ELSE NULL END
               FROM era_tester_users u
               WHERE u.id = c.created_by
             ),
             last_run_id = COALESCE($1, c.last_run_id),
             updated_at = NOW() 
         WHERE c.id = $2`,
        [activeRunId, caseId]
      );

      // Ghi nhận lịch sử kiểm thử (Audit Log)
      await query(
        `INSERT INTO era_tester_case_history 
         (case_id, run_id, actor_name, action, from_status, to_status, note, git_commit_hash)
         VALUES ($1, $2, $3, 'AUTO_GIT_VERIFY', $4, 'VERIFY', $5, $6)`,
        [
          caseId,
          activeRunId,
          commit.authorName,
          oldStatus,
          `Dev đã đẩy commit sửa lỗi: ${commit.message}`,
          commit.hash,
        ]
      );
    }
  }

  // 4. Fetch các modules để đối chiếu file patterns
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

  // 5. Đánh dấu cờ Git Impact cho các case thuộc module bị ảnh hưởng (KHÔNG đổi case sang NEW!)
  if (impactedModules.length > 0) {
    const moduleIds = impactedModules.map((m) => m.id);

    // Bật cờ is_impacted_by_git
    await query(
      `UPDATE era_tester_cases 
       SET is_impacted_by_git = TRUE, 
           last_run_id = COALESCE($1, last_run_id),
           updated_at = NOW() 
       WHERE module_id = ANY($2::int[])`,
      [activeRunId, moduleIds]
    );

    // Tự động gán Tester nếu case chưa có ai nhận
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

    // 6. Lưu git log
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
        authorEmail,
        modifiedFiles,
        JSON.stringify(impactedModules),
      ]
    );

    // 7. Gửi email thông báo
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
    referencedCases: referencedCaseIds,
    activeRunId,
    skippedCommits: payload.commits.length - relevantCommits.length,
  };
}
