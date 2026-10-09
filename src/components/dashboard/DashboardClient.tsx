"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { TestCase } from "@/components/CaseDetailModal";
import StepChecklistDrawer from "@/components/StepChecklistDrawer";
import CaseDetailModal from "@/components/CaseDetailModal";
import { ProjectSidebar } from "./ProjectSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardCanvas } from "./DashboardCanvas";
import { ProjectModal } from "@/components/modals/ProjectModal";
import { ModuleModal } from "@/components/modals/ModuleModal";
import { FlowModal } from "@/components/modals/FlowModal";
import { AddCaseModal } from "@/components/modals/AddCaseModal";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";

export interface DashboardClientProps {
  currentUser: any;
  initialProjects: any[];
  availableTesters: any[];
}

export default function DashboardClient({
  currentUser,
  initialProjects,
  availableTesters,
}: DashboardClientProps) {
  // Projects state
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [selectedProject, setSelectedProject] = useState<any>(
    initialProjects.length > 0 ? initialProjects[0] : null
  );
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<any>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [projectModal, setProjectModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    data?: any;
  }>({ open: false, mode: "create" });

  // Modules state
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [moduleModal, setModuleModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    data?: any;
  }>({ open: false, mode: "create" });

  // Flows state
  const [flows, setFlows] = useState<any[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [flowModal, setFlowModal] = useState<{
    open: boolean;
    title: string;
    templateType: "login" | "custom";
  }>({ open: false, title: "", templateType: "login" });

  // Cases state
  const [cases, setCases] = useState<TestCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [selectedStep, setSelectedStep] = useState<{
    id: string;
    title: string;
    description?: string;
  } | null>(null);

  // View & Search
  const [viewMode, setViewMode] = useState<"flow" | "kanban">("flow");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddCaseModal, setShowAddCaseModal] = useState(false);

  // Fetch projects list
  const fetchProjects = useCallback(async (selectId?: number) => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data?.projects) {
        setProjects(data.projects);
        if (selectId) {
          const match = data.projects.find((p: any) => p.id === selectId);
          if (match) setSelectedProject(match);
        } else if (data.projects.length > 0 && !selectedProject) {
          setSelectedProject(data.projects[0]);
        }
      }
    } catch (e) {
      console.error("Lỗi tải danh sách dự án:", e);
    }
  }, [selectedProject]);

  // Fetch modules for a project
  const fetchModules = useCallback(async (projId: number, selectId?: number) => {
    try {
      const res = await fetch(`/api/modules?projectId=${projId}`);
      const data = await res.json();
      if (data?.modules) {
        setModules(data.modules);
        if (selectId) {
          const match = data.modules.find((m: any) => m.id === selectId);
          if (match) setSelectedModule(match);
        } else if (data.modules.length > 0) {
          setSelectedModule(data.modules[0]);
        } else {
          setSelectedModule(null);
          setFlows([]);
          setSelectedFlow(null);
          setCases([]);
        }
      }
    } catch (e) {
      console.error("Lỗi tải modules:", e);
    }
  }, []);

  // Fetch flows and cases for a module
  const fetchFlowsAndCases = useCallback(async (modId: number) => {
    setLoading(true);
    try {
      const [flowsRes, casesRes] = await Promise.all([
        fetch(`/api/flows?moduleId=${modId}`),
        fetch(`/api/cases?moduleId=${modId}`),
      ]);

      const flowsData = await flowsRes.json();
      const casesData = await casesRes.json();

      if (flowsData?.flows) {
        setFlows(flowsData.flows);
        if (flowsData.flows.length > 0) {
          setSelectedFlow(flowsData.flows[0]);
        } else {
          setSelectedFlow(null);
        }
      }

      if (casesData?.cases) {
        setCases(casesData.cases);
      } else {
        setCases([]);
      }
    } catch (e) {
      console.error("Lỗi tải flows & cases:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger loading modules when selectedProject changes
  useEffect(() => {
    if (selectedProject?.id) {
      fetchModules(selectedProject.id);
    }
  }, [selectedProject, fetchModules]);

  // Trigger loading flows & cases when selectedModule changes
  useEffect(() => {
    if (selectedModule?.id) {
      fetchFlowsAndCases(selectedModule.id);
    }
  }, [selectedModule, fetchFlowsAndCases]);

  // Project handlers
  const handleDeleteProject = (proj: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteProject(proj);
  };

  const handleExecuteDeleteProject = async () => {
    if (!confirmDeleteProject) return;
    setIsDeletingProject(true);
    try {
      const res = await fetch(`/api/projects/${confirmDeleteProject.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (selectedProject?.id === confirmDeleteProject.id) {
          setSelectedProject(null);
        }
        setConfirmDeleteProject(null);
        await fetchProjects();
      } else {
        alert(data.error || "Không thể xóa dự án");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa dự án!");
    } finally {
      setIsDeletingProject(false);
    }
  };

  // Module handlers
  const handleDeleteModule = async (mod: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = confirm(
      `Bạn có chắc muốn xóa nhóm kiểm thử "${mod.name}" và toàn bộ user flows của nó?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/modules/${mod.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (selectedModule?.id === mod.id) {
          setSelectedModule(null);
        }
        await fetchModules(selectedProject.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Flow handlers
  const handleDeleteFlow = async (flow: any) => {
    const confirmed = confirm(`Bạn có chắc muốn xóa sơ đồ User Flow "${flow.title}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/flows/${flow.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchFlowsAndCases(selectedModule.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveFlowLayout = async (nodes: any[], edges: any[]) => {
    if (!selectedFlow?.id) return;
    try {
      await fetch(`/api/flows/${selectedFlow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      });
      setSelectedFlow((prev: any) => ({ ...prev, nodes, edges }));
    } catch (err) {
      console.error("Lỗi lưu sơ đồ:", err);
    }
  };

  const handleDeleteStepFromFlow = async (stepId: string) => {
    if (!selectedFlow?.id) return;
    const currentNodes = selectedFlow.nodes || [];
    const currentEdges = selectedFlow.edges || [];
    const nextNodes = currentNodes.filter((n: any) => n.id !== stepId);
    const nextEdges = currentEdges.filter(
      (e: any) => e.source !== stepId && e.target !== stepId
    );
    await handleSaveFlowLayout(nextNodes, nextEdges);
    setSelectedStep(null);
  };

  // Case & Checklist handlers
  const handleStatusChange = async (
    id: number,
    nextStatus: "NEW" | "FIX" | "VERIFY" | "CLOSED"
  ) => {
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        setCases((prev) => prev.map((c) => (c.id === id ? data.case : c)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaimTask = async (id: number, action: "claim_bug" | "claim_test") => {
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        setCases((prev) => prev.map((c) => (c.id === id ? data.case : c)));
        if (selectedCase?.id === id) setSelectedCase(data.case);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddChecklistCase = async (newCase: Partial<TestCase>) => {
    if (!selectedModule?.id) return;
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCase,
          moduleId: selectedModule.id,
          flowId: selectedFlow?.id || null,
        }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        setCases((prev) => [data.case, ...prev]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCase = async (id: number) => {
    try {
      await fetch(`/api/cases/${id}`, { method: "DELETE" });
      setCases((prev) => prev.filter((c) => c.id !== id));
      if (selectedCase?.id === id) setSelectedCase(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Memoized filtered cases
  const displayedCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.toLowerCase();
    return cases.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.input_data?.toLowerCase().includes(q) ||
        c.actual_result?.toLowerCase().includes(q) ||
        String(c.id).includes(q)
    );
  }, [cases, searchQuery]);

  // Memoized metrics
  const stats = useMemo(() => {
    const total = cases.length;
    const passed = cases.filter((c) => c.status === "CLOSED").length;
    const bugs = cases.filter((c) => c.status === "NEW").length;
    const fixing = cases.filter((c) => c.status === "FIX").length;
    const verify = cases.filter((c) => c.status === "VERIFY").length;
    const gitImpacted = cases.filter((c) => c.is_impacted_by_git).length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 100;

    return { total, passed, bugs, fixing, verify, gitImpacted, passRate };
  }, [cases]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Sidebar */}
      <ProjectSidebar
        userRole={currentUser?.role}
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={(p) => setSelectedProject(p)}
        onOpenCreateProject={() =>
          setProjectModal({ open: true, mode: "create" })
        }
        onOpenEditProject={(p, e) => {
          e.stopPropagation();
          setProjectModal({ open: true, mode: "edit", data: p });
        }}
        onDeleteProject={handleDeleteProject}
        modules={modules}
        selectedModule={selectedModule}
        onSelectModule={(m) => setSelectedModule(m)}
        onOpenCreateModule={() =>
          setModuleModal({ open: true, mode: "create" })
        }
        onOpenEditModule={(m, e) => {
          e.stopPropagation();
          setModuleModal({ open: true, mode: "edit", data: m });
        }}
        onDeleteModule={handleDeleteModule}
      />

      {/* Main Workspace Stage */}
      <main className="flex-1 flex flex-col p-5 overflow-hidden">
        <DashboardHeader
          userRole={currentUser?.role}
          selectedProject={selectedProject}
          selectedModule={selectedModule}
          viewMode={viewMode}
          onViewModeChange={(mode) => setViewMode(mode)}
          onOpenAddCaseModal={() => setShowAddCaseModal(true)}
          flows={flows}
          selectedFlow={selectedFlow}
          onSelectFlow={(f) => setSelectedFlow(f)}
          onDeleteFlow={handleDeleteFlow}
          onOpenFlowModal={(templateType) =>
            setFlowModal({
              open: true,
              title:
                templateType === "login"
                  ? "Luồng Đăng Nhập & Kiểm Tra Biểu Mẫu"
                  : "",
              templateType,
            })
          }
          stats={stats}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />

        <div className="flex-1 overflow-hidden relative">
          <DashboardCanvas
            loading={loading}
            viewMode={viewMode}
            selectedFlow={selectedFlow}
            displayedCases={displayedCases}
            onSelectStep={(step) => setSelectedStep(step)}
            onSaveFlowLayout={handleSaveFlowLayout}
            onSelectCase={(c) => setSelectedCase(c)}
            onStatusChange={handleStatusChange}
            onAddNewCase={() => setShowAddCaseModal(true)}
            onClaimTask={handleClaimTask}
            onOpenFlowModal={(templateType) =>
              setFlowModal({
                open: true,
                title:
                  templateType === "login"
                    ? "Luồng Đăng Nhập & Kiểm Tra Biểu Mẫu"
                    : "",
                templateType,
              })
            }
          />
        </div>
      </main>

      {/* Drawer Xem Chi Tiết Bước & Checklist */}
      <StepChecklistDrawer
        step={selectedStep}
        cases={cases}
        moduleId={selectedModule?.id || 0}
        flowId={selectedFlow?.id || null}
        onClose={() => setSelectedStep(null)}
        onSelectCase={(c) => setSelectedCase(c)}
        onAddCase={handleAddChecklistCase}
        onUpdateCase={(updated) => {
          setCases((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
          if (selectedCase?.id === updated.id) setSelectedCase(updated);
        }}
        onStatusChange={handleStatusChange}
        onDeleteCase={handleDeleteCase}
        onDeleteStep={handleDeleteStepFromFlow}
        onClaimTask={handleClaimTask}
      />

      {/* Modal Chi Tiết Case */}
      <CaseDetailModal
        testCase={selectedCase}
        currentUser={currentUser}
        onClose={() => setSelectedCase(null)}
        onUpdate={(updated) => {
          setCases((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
          setSelectedCase(null);
        }}
        onDelete={(id) => {
          handleDeleteCase(id);
          setSelectedCase(null);
        }}
      />

      {/* Modals con được tách biệt */}
      <ProjectModal
        open={projectModal.open}
        mode={projectModal.mode}
        initialData={projectModal.data}
        onClose={() => setProjectModal((prev) => ({ ...prev, open: false }))}
        onSuccess={(saved) => fetchProjects(saved.id)}
      />

      <ModuleModal
        open={moduleModal.open}
        mode={moduleModal.mode}
        projectId={selectedProject?.id || 0}
        initialData={moduleModal.data}
        availableTesters={availableTesters}
        onClose={() => setModuleModal((prev) => ({ ...prev, open: false }))}
        onSuccess={(saved) => {
          if (selectedProject?.id) {
            fetchModules(selectedProject.id, saved.id);
          }
        }}
      />

      <FlowModal
        open={flowModal.open}
        moduleId={selectedModule?.id || 0}
        moduleName={selectedModule?.name}
        defaultTitle={flowModal.title}
        defaultTemplateType={flowModal.templateType}
        onClose={() => setFlowModal((prev) => ({ ...prev, open: false }))}
        onSuccess={(newFlow) => {
          if (selectedModule?.id) {
            fetchFlowsAndCases(selectedModule.id);
            setSelectedFlow(newFlow);
          }
        }}
      />

      <AddCaseModal
        open={showAddCaseModal}
        moduleId={selectedModule?.id || 0}
        flowId={selectedFlow?.id || null}
        nodeId={selectedStep?.id || selectedFlow?.nodes?.[0]?.id || "step-1"}
        onClose={() => setShowAddCaseModal(false)}
        onSuccess={(newCase) => setCases((prev) => [newCase, ...prev])}
      />

      {/* Modal xác thực an toàn Type-to-Confirm khi xóa dự án */}
      <ConfirmDeleteModal
        open={!!confirmDeleteProject}
        title="Xác Nhận Xóa Mềm Dự Án"
        description="Dự án và toàn bộ dữ liệu kiểm thử sẽ được chuyển sang trạng thái lưu trữ an toàn (Soft Delete). Chỉ Super Admin mới có quyền thực hiện thao tác này."
        confirmTarget={confirmDeleteProject?.name || ""}
        targetLabel="tên dự án"
        isLoading={isDeletingProject}
        onConfirm={handleExecuteDeleteProject}
        onClose={() => setConfirmDeleteProject(null)}
      />
    </div>
  );
}
