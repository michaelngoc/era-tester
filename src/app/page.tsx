import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getInitialProjects,
  getInitialTesters,
  getModulesForUser,
  getModuleWorkspace,
} from "@/lib/server-queries";
import Navbar from "@/components/Navbar";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    redirect("/login");
  }

  const [projects, testers] = await Promise.all([
    getInitialProjects(user),
    getInitialTesters(),
  ]);

  // Tải sẵn module đầu tiên của project đầu tiên + flows/cases của module đó,
  // để client không phải đi thác 3 request khi mở dashboard. Lỗi thì để client tự fetch.
  let initialModules: any[] | null = null;
  let initialWorkspace: { moduleId: number; flows: any[]; cases: any[] } | null = null;
  if (projects.length > 0) {
    try {
      initialModules = await getModulesForUser(user, { projectId: projects[0].id });
      if (initialModules.length > 0) {
        const ws = await getModuleWorkspace(user, initialModules[0].id);
        if (ws.status === "ok") {
          initialWorkspace = { moduleId: initialModules[0].id, flows: ws.flows, cases: ws.cases };
        }
      }
    } catch (err) {
      console.error("[dashboard preload error]:", err);
      initialModules = null;
      initialWorkspace = null;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white transition-colors duration-150">
      <Navbar user={user} />
      <DashboardClient
        currentUser={user}
        initialProjects={projects}
        availableTesters={testers}
        initialModules={initialModules}
        initialWorkspace={initialWorkspace}
      />
    </div>
  );
}
