"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { TestCase } from "@/components/CaseDetailModal";
import StepChecklistDrawer from "@/components/StepChecklistDrawer";
import CaseDetailModal from "@/components/CaseDetailModal";
import { ProjectSidebar } from "./ProjectSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardCanvas } from "./DashboardCanvas";
import { ProjectModal } from "@/components/modals/ProjectModal";
import { ProjectMembersModal } from "@/components/modals/ProjectMembersModal";
import { ModuleModal } from "@/components/modals/ModuleModal";
import { FlowModal } from "@/components/modals/FlowModal";
import { AddCaseModal } from "@/components/modals/AddCaseModal";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import { useToast } from "@/context/ToastContext";

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
  const { toast, confirm } = useToast();

  // Projects state
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [selectedProject, setSelectedProject] = useState<any>(
    initialProjects.length > 0 ? initialProjects[0] : null
  );
  const [confirmDeleteProject, setConfirmDeleteProject] = useState<any>(null);
  const [managingMembersProject, setManagingMembersProject] = useState<any>(null);
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
  }>({ open: false, title: "" });

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
        toast.success("Đã xóa dự án thành công!");
      } else {
        toast.error(data.error || "Không thể xóa dự án");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi kết nối khi xóa dự án: " + (err.message || ""));
    } finally {
      setIsDeletingProject(false);
    }
  };

  // Module handlers
  const handleReorderModules = async (newOrderedModules: any[]) => {
    setModules(newOrderedModules);
    try {
      const res = await fetch("/api/modules/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: newOrderedModules.map((m) => m.id) }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Không thể lưu thứ tự nhóm kiểm thử");
        if (selectedProject?.id) fetchModules(selectedProject.id);
      } else {
        toast.success("Đã cập nhật thứ tự nhóm kiểm thử");
      }
    } catch (err: any) {
      toast.error("Lỗi cập nhật thứ tự: " + (err.message || ""));
      if (selectedProject?.id) fetchModules(selectedProject.id);
    }
  };

  const handleDeleteModule = async (mod: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: "Xóa Nhóm Kiểm Thử",
      message: `Bạn có chắc muốn xóa nhóm kiểm thử "${mod.name}" và toàn bộ user flows của nó?`,
      confirmText: "Xóa Nhóm",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/modules/${mod.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (selectedModule?.id === mod.id) {
          setSelectedModule(null);
        }
        await fetchModules(selectedProject.id);
        toast.success(`Đã xóa nhóm kiểm thử "${mod.name}"`);
      } else {
        toast.error(data.error || "Không thể xóa nhóm kiểm thử");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi khi xóa nhóm: " + err.message);
    }
  };

  // Flow handlers
  const handleDeleteFlow = async (flow: any) => {
    const confirmed = await confirm({
      title: "Xóa Sơ Đồ User Flow",
      message: `Bạn có chắc muốn xóa sơ đồ User Flow "${flow.title}"?`,
      confirmText: "Xóa Flow",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/flows/${flow.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchFlowsAndCases(selectedModule.id);
        toast.success(`Đã xóa sơ đồ "${flow.title}"`);
      } else {
        toast.error(data.error || "Không thể xóa sơ đồ");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi khi xóa sơ đồ: " + err.message);
    }
  };

  const handleSaveFlowLayout = async (nodes: any[], edges: any[]) => {
    if (!selectedFlow?.id) return;
    try {
      const res = await fetch(`/api/flows/${selectedFlow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Lỗi lưu sơ đồ vào cơ sở dữ liệu");
        return;
      }
      setSelectedFlow((prev: any) => ({ ...prev, nodes, edges }));
      setFlows((prev) =>
        prev.map((f) => (f.id === selectedFlow.id ? { ...f, nodes, edges } : f))
      );
    } catch (err: any) {
      console.error("Lỗi lưu sơ đồ:", err);
      toast.error("Lỗi kết nối khi lưu sơ đồ: " + err.message);
    }
  };

  const handleDeleteStepFromFlow = async (stepId: string) => {
    if (!selectedFlow?.id) return;
    const currentNodes = selectedFlow.nodes || [];
    const remainingNodes = currentNodes.filter((n: any) => n.id !== stepId);

    // Sort remaining nodes from left to right
    const sorted = [...remainingNodes].sort(
      (a: any, b: any) => (a.position?.x ?? 0) - (b.position?.x ?? 0)
    );

    // Renumber remaining nodes sequentially (Bước 1, Bước 2, Bước 3...)
    const reindexedNodes = sorted.map((node: any, idx: number) => {
      const stepNum = idx + 1;
      let rawTitle = node.data?.title || `Bước ${stepNum}`;
      rawTitle = rawTitle.replace(/^(Bước|Step)\s*\d+\s*[:\-]\s*/i, "").trim();
      if (!rawTitle) rawTitle = `Bước ${stepNum}`;
      return {
        ...node,
        position: {
          x: idx * 320 + 60,
          y: node.position?.y ?? 120,
        },
        data: {
          ...node.data,
          title: `Bước ${stepNum}: ${rawTitle}`,
        },
      };
    });

    // Reconnect linear edges
    const reindexedEdges: any[] = [];
    for (let i = 0; i < reindexedNodes.length - 1; i++) {
      reindexedEdges.push({
        id: `e-${reindexedNodes[i].id}-${reindexedNodes[i + 1].id}`,
        source: reindexedNodes[i].id,
        target: reindexedNodes[i + 1].id,
        style: { stroke: "#38bdf8", strokeWidth: 2 },
        markerEnd: {
          type: "arrowclosed",
          color: "#38bdf8",
          width: 16,
          height: 16,
        },
      });
    }

    await handleSaveFlowLayout(reindexedNodes, reindexedEdges);
    setSelectedStep(null);
    toast.success("Đã xóa bước và tự động đánh lại số thứ tự sơ đồ!");
  };

  // Case & Checklist handlers
  const handleStatusChange = async (
    id: number,
    nextStatus: "NEW" | "FIX" | "VERIFY" | "DEPLOY" | "CLOSED"
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
        if (nextStatus === "CLOSED") {
          toast.success("Đã đánh dấu Đạt kiểm thử!");
        } else if (nextStatus === "NEW") {
          toast.warning("Đã báo lỗi phát sinh cho kịch bản!");
        }
      } else {
        toast.error(data.error || "Không thể cập nhật trạng thái");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi cập nhật trạng thái: " + err.message);
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
        toast.success(
          action === "claim_bug" ? "Đã nhận khắc phục lỗi thành công!" : "Đã nhận phụ trách kiểm thử!"
        );
      } else {
        toast.error(data.error || "Không thể nhận nhiệm vụ");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi nhận nhiệm vụ: " + err.message);
    }
  };

  const handleAddChecklistCase = async (newCase: Partial<TestCase>) => {
    if (!selectedModule?.id) {
      toast.error("Vui lòng chọn nhóm kiểm thử trước!");
      return;
    }
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
      if (!res.ok || !data.success || !data.case) {
        toast.error(data.error || "Không thể thêm kịch bản kiểm thử");
        throw new Error(data.error || "Lỗi lưu kịch bản");
      }
      setCases((prev) => [data.case, ...prev]);
      toast.success(`Đã thêm kịch bản "${data.case.title}" thành công!`);
    } catch (err: any) {
      console.error("Lỗi tạo checklist case:", err);
      toast.error(err.message || "Lỗi khi lưu kịch bản");
      throw err;
    }
  };

  const handleDeleteCase = async (id: number) => {
    try {
      const res = await fetch(`/api/cases/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Không thể xóa kịch bản");
        return;
      }
      setCases((prev) => prev.filter((c) => c.id !== id));
      if (selectedCase?.id === id) setSelectedCase(null);
      toast.success("Đã xóa kịch bản kiểm thử");
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi khi xóa kịch bản: " + err.message);
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
    const deploy = cases.filter((c) => c.status === "DEPLOY").length;
    const gitImpacted = cases.filter((c) => c.is_impacted_by_git).length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 100;

    return { total, passed, bugs, fixing, verify, deploy, gitImpacted, passRate };
  }, [cases]);

  const effectiveRole = currentUser?.isGlobalAdmin ? "SUPER_ADMIN" : currentUser?.role;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Sidebar */}
      <ProjectSidebar
        userRole={effectiveRole}
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
        onOpenManageMembers={(p, e) => {
          e.stopPropagation();
          setManagingMembersProject(p);
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
        onReorderModules={handleReorderModules}
      />

      {/* Main Workspace Stage */}
      <main className="flex-1 flex flex-col p-5 overflow-hidden">
        <DashboardHeader
          userRole={effectiveRole}
          selectedProject={selectedProject}
          selectedModule={selectedModule}
          viewMode={viewMode}
          onViewModeChange={(mode) => setViewMode(mode)}
          onOpenAddCaseModal={() => setShowAddCaseModal(true)}
          flows={flows}
          selectedFlow={selectedFlow}
          onSelectFlow={(f) => setSelectedFlow(f)}
          onDeleteFlow={handleDeleteFlow}
          onOpenFlowModal={() => setFlowModal({ open: true, title: "" })}
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
            onOpenFlowModal={() => setFlowModal({ open: true, title: "" })}
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

      {/* Modal phân công thành viên dự án */}
      <ProjectMembersModal
        open={!!managingMembersProject}
        project={managingMembersProject}
        currentUser={currentUser}
        onClose={() => setManagingMembersProject(null)}
        onUpdated={() => fetchProjects(selectedProject?.id)}
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
