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

export interface QueryUser {
  id: number;
  isGlobalAdmin: boolean;
}

export async function getModulesForUser(
  user: QueryUser,
  filters: { projectId?: string | number | null; projectSlug?: string | null } = {}
): Promise<any[]> {
  let sql = `
    SELECT m.*,
           p.name AS project_name, p.slug AS project_slug,
           COUNT(c.id) AS total_cases,
           COUNT(CASE WHEN c.status = 'NEW' THEN 1 END) AS count_new,
           COUNT(CASE WHEN c.status = 'FIX' THEN 1 END) AS count_fix,
           COUNT(CASE WHEN c.status = 'VERIFY' THEN 1 END) AS count_verify,
           COUNT(CASE WHEN c.status = 'DEPLOY' THEN 1 END) AS count_deploy,
           COUNT(CASE WHEN c.status = 'CLOSED' THEN 1 END) AS count_closed,
           COUNT(CASE WHEN c.is_impacted_by_git = TRUE THEN 1 END) AS count_git_impacted,
           COALESCE(
             (
               SELECT json_agg(json_build_object('id', u.id, 'name', u.full_name, 'email', u.email))
               FROM era_tester_users u
               WHERE u.id = ANY(m.assigned_testers)
             ),
             '[]'::json
           ) AS assigned_tester_users,
           COALESCE(
             (
               SELECT json_agg(json_build_object('id', f.id, 'title', f.title))
               FROM era_tester_flows f
               WHERE f.module_id = m.id AND (f.is_deleted IS NULL OR f.is_deleted = FALSE)
             ),
             '[]'::json
           ) AS flows
    FROM era_tester_modules m
    JOIN era_tester_projects p ON p.id = m.project_id
    LEFT JOIN era_tester_cases c ON c.module_id = m.id AND (c.is_deleted IS NULL OR c.is_deleted = FALSE)
    WHERE (m.is_deleted IS NULL OR m.is_deleted = FALSE)
      AND (p.is_deleted IS NULL OR p.is_deleted = FALSE)
  `;
  const params: any[] = [];

  if (!user.isGlobalAdmin) {
    params.push(user.id);
    sql += ` AND p.id IN (SELECT project_id FROM era_tester_project_members WHERE user_id = $${params.length}) `;
  }

  if (filters.projectId) {
    params.push(filters.projectId);
    sql += ` AND m.project_id = $${params.length}`;
  } else if (filters.projectSlug) {
    params.push(filters.projectSlug);
    sql += ` AND p.slug = $${params.length}`;
  }

  sql += ` GROUP BY m.id, p.name, p.slug ORDER BY COALESCE(m.sort_order, 0) ASC, m.id ASC`;

  const res = await query(sql, params);
  return res.rows;
}

export async function getFlowsForModule(moduleId: string | number): Promise<any[]> {
  const res = await query(
    `SELECT f.*,
            COUNT(c.id) AS total_cases,
            COUNT(CASE WHEN c.status = 'NEW' THEN 1 END) AS count_new,
            COUNT(CASE WHEN c.status = 'CLOSED' THEN 1 END) AS count_closed
     FROM era_tester_flows f
     LEFT JOIN era_tester_cases c ON c.flow_id = f.id AND (c.is_deleted IS NULL OR c.is_deleted = FALSE)
     WHERE f.module_id = $1 AND (f.is_deleted IS NULL OR f.is_deleted = FALSE)
     GROUP BY f.id
     ORDER BY f.id ASC`,
    [moduleId]
  );
  return res.rows;
}

export async function getCasesForUser(
  user: QueryUser,
  filters: {
    projectId?: string | number | null;
    moduleId?: string | number | null;
    flowId?: string | number | null;
    status?: string | null;
  } = {}
): Promise<any[]> {
  let sql = `
    SELECT c.*,
           m.name AS module_name,
           m.project_id,
           COALESCE(NULLIF(u_assigned.full_name, ''), u_assigned.email) AS assigned_name,
           u_assigned.email AS assigned_email,
           COALESCE(NULLIF(u_creator.full_name, ''), u_creator.email) AS creator_name
    FROM era_tester_cases c
    JOIN era_tester_modules m ON m.id = c.module_id
    LEFT JOIN era_tester_users u_assigned ON u_assigned.id = c.assigned_to
    LEFT JOIN era_tester_users u_creator ON u_creator.id = c.created_by
    WHERE (c.is_deleted IS NULL OR c.is_deleted = FALSE)
      AND (m.is_deleted IS NULL OR m.is_deleted = FALSE)
  `;
  const params: any[] = [];

  if (!user.isGlobalAdmin) {
    params.push(user.id);
    sql += ` AND m.project_id IN (SELECT project_id FROM era_tester_project_members WHERE user_id = $${params.length}) `;
  }

  if (filters.projectId) {
    params.push(filters.projectId);
    sql += ` AND m.project_id = $${params.length}`;
  }
  if (filters.moduleId) {
    params.push(filters.moduleId);
    sql += ` AND c.module_id = $${params.length}`;
  }
  if (filters.flowId) {
    params.push(filters.flowId);
    sql += ` AND c.flow_id = $${params.length}`;
  }
  if (filters.status) {
    params.push(filters.status);
    sql += ` AND c.status = $${params.length}`;
  }

  sql += ` ORDER BY c.id DESC`;

  const res = await query(sql, params);
  return res.rows;
}

export type ModuleWorkspaceResult =
  | { status: "ok"; flows: any[]; cases: any[] }
  | { status: "not_found" }
  | { status: "forbidden" };

/** Flows + cases của một module trong một lượt (3 query song song, 1 round-trip). */
export async function getModuleWorkspace(
  user: QueryUser,
  moduleId: number
): Promise<ModuleWorkspaceResult> {
  const [access, flows, cases] = await Promise.all([
    query<{ is_member: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM era_tester_project_members pm
         WHERE pm.project_id = m.project_id AND pm.user_id = $2
       ) AS is_member
       FROM era_tester_modules m
       WHERE m.id = $1 AND (m.is_deleted IS NULL OR m.is_deleted = FALSE)`,
      [moduleId, user.id]
    ),
    getFlowsForModule(moduleId),
    getCasesForUser(user, { moduleId }),
  ]);

  if (access.rows.length === 0) return { status: "not_found" };
  if (!user.isGlobalAdmin && !access.rows[0].is_member) return { status: "forbidden" };
  return { status: "ok", flows, cases };
}
