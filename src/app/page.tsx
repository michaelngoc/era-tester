import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getInitialProjects, getInitialTesters } from "@/lib/server-queries";
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white transition-colors duration-150">
      <Navbar user={user} />
      <DashboardClient
        currentUser={user}
        initialProjects={projects}
        availableTesters={testers}
      />
    </div>
  );
}
