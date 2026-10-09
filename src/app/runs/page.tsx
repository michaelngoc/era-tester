import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import Navbar from "@/components/Navbar";
import RunsListClient, { RunItem } from "@/components/runs/RunsListClient";

export default async function RunsPage() {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    redirect("/login");
  }

  // Pre-fetch runs & projects trên Server Component
  const [runsRes, projsRes] = await Promise.all([
    query<RunItem>(`
      SELECT r.*,
             p.name as project_name,
             p.github_repo,
             u.full_name as creator_name,
             u.email as creator_email,
             COUNT(DISTINCT c.id) as total_cases_count,
             COUNT(DISTINCT CASE WHEN c.status = 'CLOSED' THEN c.id END) as passed_cases_count,
             COUNT(DISTINCT CASE WHEN c.status = 'NEW' THEN c.id END) as failed_cases_count,
             COUNT(DISTINCT CASE WHEN c.status IN ('FIX', 'VERIFY') THEN c.id END) as fixing_cases_count
      FROM era_tester_runs r
      JOIN era_tester_projects p ON p.id = r.project_id AND (p.is_deleted IS NULL OR p.is_deleted = FALSE)
      LEFT JOIN era_tester_users u ON u.id = r.created_by
      LEFT JOIN era_tester_cases c ON c.last_run_id = r.id AND (c.is_deleted IS NULL OR c.is_deleted = FALSE)
      WHERE (r.is_deleted IS NULL OR r.is_deleted = FALSE)
      GROUP BY r.id, p.name, p.github_repo, u.full_name, u.email
      ORDER BY r.created_at DESC
    `),
    query<{ id: number; name: string }>(`
      SELECT id, name FROM era_tester_projects WHERE (is_deleted IS NULL OR is_deleted = FALSE) ORDER BY id ASC
    `),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white transition-colors duration-150">
      <Navbar user={user} />
      <main className="flex-1 flex overflow-y-auto">
        <RunsListClient
          initialRuns={runsRes.rows}
          projects={projsRes.rows}
        />
      </main>
    </div>
  );
}
