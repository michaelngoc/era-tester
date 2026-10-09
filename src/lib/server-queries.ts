import "server-only";
import { query } from "./db";

import { isGlobalAdminRole } from "./permissions";

export interface ProjectItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  github_repo: string | null;
  created_at: string;
  total_modules: number;
  total_cases: number;
  new_bugs: number;
  git_impacted_cases: number;
}

export interface TesterUser {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  status: "PENDING" | "ACTIVE" | "BANNED" | "INACTIVE";
}

export async function getInitialProjects(user?: { id: number; role: string; isGlobalAdmin?: boolean } | null): Promise<ProjectItem[]> {
  try {
    const isGlobalAdmin = user?.isGlobalAdmin ?? (await isGlobalAdminRole(user?.role));
    let sql = `
      SELECT p.id,
             p.name,
             p.slug,
             p.description,
             p.github_repo,
             p.created_at,
             COUNT(DISTINCT m.id)::int AS total_modules,
             COUNT(DISTINCT c.id)::int AS total_cases,
             COUNT(DISTINCT CASE WHEN c.status = 'NEW' THEN c.id END)::int AS new_bugs,
             COUNT(DISTINCT CASE WHEN c.is_impacted_by_git = TRUE THEN c.id END)::int AS git_impacted_cases
      FROM era_tester_projects p
      LEFT JOIN era_tester_modules m ON m.project_id = p.id AND (m.is_deleted IS NULL OR m.is_deleted = FALSE)
      LEFT JOIN era_tester_cases c ON c.module_id = m.id AND (c.is_deleted IS NULL OR c.is_deleted = FALSE)
      WHERE (p.is_deleted IS NULL OR p.is_deleted = FALSE)
    `;
    const params: any[] = [];

    // Nếu không phải SUPER_ADMIN (kể cả CTO, QA, QC, DEV), bắt buộc phải có trong thành viên dự án mới thấy!
    if (!isGlobalAdmin && user?.id) {
      params.push(user.id);
      sql += ` AND p.id IN (SELECT project_id FROM era_tester_project_members WHERE user_id = $1) `;
    } else if (!isGlobalAdmin && !user?.id) {
      return [];
    }

    sql += ` GROUP BY p.id ORDER BY p.id ASC`;

    const res = await query<ProjectItem>(sql, params);
    return res.rows;
  } catch (err) {
    console.error("[getInitialProjects error]:", err);
    return [];
  }
}

export async function getInitialTesters(): Promise<TesterUser[]> {
  try {
    const res = await query<TesterUser>(`
      SELECT id, email, full_name, role, status
      FROM era_tester_users
      WHERE status = 'ACTIVE' 
        AND role IN ('TESTER', 'QA', 'QC', 'SUPER_ADMIN', 'CTO', 'LEADER', 'DEVELOPER', 'MEMBER')
      ORDER BY 
        CASE 
          WHEN role = 'SUPER_ADMIN' THEN 1
          WHEN role = 'CTO' THEN 2
          WHEN role = 'LEADER' THEN 3
          WHEN role = 'QA' THEN 4
          WHEN role = 'QC' THEN 5
          WHEN role = 'TESTER' THEN 6
          ELSE 7
        END ASC, 
        full_name ASC
    `);
    return res.rows;
  } catch (err) {
    console.error("[getInitialTesters error]:", err);
    return [];
  }
}
