"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TestCase } from "./CaseDetailModal";
import {
  GitCommit,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Eye,
  Plus,
  ListChecks,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface FlowDiagramProps {
  cases: TestCase[];
  flowNodes?: any[];
  flowEdges?: any[];
  onSelectStep: (step: { id: string; title: string; description?: string }) => void;
  onSaveFlow?: (nodes: Node[], edges: Edge[]) => void;
  onAddStep?: (stepTitle: string) => void;
}

// Custom Node Component hiển thị Bước và số lượng Checklist bên trong
function TestStepNode({ data }: { data: any }) {
  const { title, description, stepId, stepCases, onSelect } = data;

  const cases: TestCase[] = stepCases || [];
  const total = cases.length;
  const bugs = cases.filter((c) => c.status === "NEW").length;
  const fixing = cases.filter((c) => c.status === "FIX").length;
  const verifying = cases.filter((c) => c.status === "VERIFY").length;
  const passed = cases.filter((c) => c.status === "CLOSED").length;
  const hasGit = cases.some((c) => c.is_impacted_by_git);

  let status: "NEW" | "FIX" | "VERIFY" | "CLOSED" | "PENDING" = "PENDING";
  if (bugs > 0) status = "NEW";
  else if (fixing > 0) status = "FIX";
  else if (verifying > 0) status = "VERIFY";
  else if (total > 0 && passed === total) status = "CLOSED";

  const statusMap = {
    NEW: {
      border: "border-rose-500/80 hover:border-rose-400 hover:shadow-rose-500/25",
      bg: "bg-white dark:bg-slate-900/95",
      text: "text-rose-600 dark:text-rose-400",
      icon: AlertCircle,
      label: "Lỗi Phát Sinh",
      badgeBg: "bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300",
    },
    FIX: {
      border: "border-sky-500/80 hover:border-sky-400 hover:shadow-sky-500/25",
      bg: "bg-white dark:bg-slate-900/95",
      text: "text-sky-600 dark:text-sky-400",
      icon: Wrench,
      label: "Đang Khắc Phục",
      badgeBg: "bg-sky-50 dark:bg-sky-500/15 border-sky-200 dark:border-sky-500/30 text-sky-700 dark:text-sky-300",
    },
    VERIFY: {
      border: "border-purple-500/80 hover:border-purple-400 hover:shadow-purple-500/25",
      bg: "bg-white dark:bg-slate-900/95",
      text: "text-purple-600 dark:text-purple-400",
      icon: Eye,
      label: "Chờ Xác Minh",
      badgeBg: "bg-purple-50 dark:bg-purple-500/15 border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300",
    },
    CLOSED: {
      border: "border-emerald-500/80 hover:border-emerald-400 hover:shadow-emerald-500/25",
      bg: "bg-white dark:bg-slate-900/95",
      text: "text-emerald-600 dark:text-emerald-400",
      icon: CheckCircle2,
      label: "Kiểm Thử Đạt",
      badgeBg: "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    },
    PENDING: {
      border: "border-slate-300 dark:border-slate-700/80 hover:border-slate-500 hover:shadow-slate-500/15",
      bg: "bg-white dark:bg-slate-900/95",
      text: "text-slate-600 dark:text-slate-400",
      icon: ListChecks,
      label: "Chưa Kiểm Thử",
      badgeBg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300",
    },
  };

  const current = statusMap[status];
  const Icon = current.icon;

  return (
    <div
      onClick={() => onSelect && onSelect({ id: stepId, title, description })}
      className={`group relative min-w-[240px] max-w-[270px] rounded-2xl border-2 p-4 shadow-xl backdrop-blur-xl transition-all duration-200 cursor-pointer hover:-translate-y-1 ${current.border} ${current.bg}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-400 dark:!bg-slate-400 !w-3 !h-3 !border-2 !border-white dark:!border-slate-900"
      />

      {/* Header bar: ID + Status + Git Alert */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          {stepId}
        </span>

        <div className="flex items-center gap-1.5">
          {hasGit && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 animate-pulse">
              <GitCommit className="w-2.5 h-2.5" />
              GIT
            </span>
          )}

          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-wider border ${current.badgeBg}`}
          >
            <Icon className="w-3 h-3 shrink-0" />
            <span>{current.label}</span>
          </span>
        </div>
      </div>

      {/* Step Title with prominent ({total}) checklist count */}
      <div className="flex items-start justify-between gap-2">
        <div className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-300 transition line-clamp-2 leading-relaxed flex-1">
          {title}
        </div>
        <span
          className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 group-hover:bg-sky-500/30 group-hover:text-sky-800 dark:group-hover:text-sky-200 transition shadow-sm"
          title={`Bước này có ${total} kịch bản kiểm thử`}
        >
          ({total})
        </span>
      </div>

      {description && (
        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
          {description}
        </div>
      )}

      {/* Footer: Quick glance indicator & click prompt */}
      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-300 transition font-medium">
          <ListChecks className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
          <span>Nhấp mở ({total}) kịch bản</span>
        </div>

        {total > 0 && (
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            {bugs > 0 && <span className="text-rose-600 dark:text-rose-400 font-bold">{bugs} Lỗi</span>}
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{passed}/{total} Đạt</span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-400 dark:!bg-slate-400 !w-3 !h-3 !border-2 !border-white dark:!border-slate-900"
      />
    </div>
  );
}

export default function FlowDiagram({
  cases,
  flowNodes,
  flowEdges,
  onSelectStep,
  onSaveFlow,
  onAddStep,
}: FlowDiagramProps) {
  const { theme } = useTheme();
  const [newStepTitle, setNewStepTitle] = useState("");
  const [showAddStepModal, setShowAddStepModal] = useState(false);

  const nodeTypes = useMemo(() => ({ testStep: TestStepNode }), []);

  const defaultNodes: Node[] = useMemo(() => {
    if (flowNodes && flowNodes.length > 0) {
      return flowNodes.map((fn: any) => ({
        ...fn,
        type: "testStep",
        data: {
          ...fn.data,
          stepId: fn.id,
          stepCases: cases.filter((c) => c.node_id === fn.id),
          onSelect: onSelectStep,
        },
      }));
    }

    const stepIds = Array.from(new Set(cases.map((c) => c.node_id || "step-1")));
    if (stepIds.length === 0) {
      stepIds.push("step-1", "step-2");
    }

    return stepIds.map((sid, index) => ({
      id: sid,
      type: "testStep",
      position: { x: index * 300 + 60, y: 120 },
      data: {
        title: `Bước ${index + 1}: ${sid === "step-1" ? "Khởi động & Mở trang" : sid === "step-2" ? "Thao tác người dùng" : "Kết quả & Điều hướng"}`,
        stepId: sid,
        stepCases: cases.filter((c) => (c.node_id || "step-1") === sid),
        onSelect: onSelectStep,
      },
    }));
  }, [flowNodes, cases, onSelectStep]);

  const defaultEdges: Edge[] = useMemo(() => {
    if (flowEdges && flowEdges.length > 0) return flowEdges;

    const edges: Edge[] = [];
    for (let i = 0; i < defaultNodes.length - 1; i++) {
      edges.push({
        id: `e-${defaultNodes[i].id}-${defaultNodes[i + 1].id}`,
        source: defaultNodes[i].id,
        target: defaultNodes[i + 1].id,
        style: { stroke: "#38bdf8", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#38bdf8",
          width: 16,
          height: 16,
        },
      });
    }
    return edges;
  }, [flowEdges, defaultNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);

  React.useEffect(() => {
    setNodes(defaultNodes);
    setEdges(defaultEdges);
  }, [defaultNodes, defaultEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const next = addEdge(
          {
            ...params,
            style: { stroke: "#38bdf8", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#38bdf8" },
          },
          eds
        );
        if (onSaveFlow) onSaveFlow(nodes, next);
        return next;
      });
    },
    [nodes, onSaveFlow, setEdges]
  );

  const handleAddStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepTitle.trim()) return;

    const nextId = `step-${nodes.length + 1}`;
    const newNode: Node = {
      id: nextId,
      type: "testStep",
      position: { x: nodes.length * 300 + 60, y: 120 },
      data: {
        title: newStepTitle.trim(),
        stepId: nextId,
        stepCases: [],
        onSelect: onSelectStep,
      },
    };

    const nextNodes = [...nodes, newNode];
    let nextEdges = edges;

    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      nextEdges = [
        ...edges,
        {
          id: `e-${lastNode.id}-${nextId}`,
          source: lastNode.id,
          target: nextId,
          style: { stroke: "#38bdf8", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#38bdf8" },
        },
      ];
    }

    setNodes(nextNodes);
    setEdges(nextEdges);
    if (onSaveFlow) onSaveFlow(nextNodes, nextEdges);

    setNewStepTitle("");
    setShowAddStepModal(false);
  };

  return (
    <div className="w-full h-full min-h-[560px] rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-950 overflow-hidden relative shadow-inner transition-colors duration-150">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800/90 p-1.5 rounded-2xl shadow-xl text-xs">
        <button
          onClick={() => setShowAddStepModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm Bước Vào Sơ Đồ</span>
        </button>

        <span className="text-[11px] text-slate-500 dark:text-slate-400 pl-2 pr-1 hidden sm:inline">
          💡 Nhấp vào bất kỳ Bước nào để quản lý Kịch bản kiểm thử
        </span>
      </div>

      {/* Legend Badge Bar */}
      <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center gap-3 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800/90 px-3.5 py-2 rounded-2xl text-[11px] font-medium shadow-xl">
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          Đạt Toàn Bộ
        </span>
        <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
          Có Lỗi Phát Sinh
        </span>
        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50" />
          Mã Git Thay Đổi
        </span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Controls className="!bg-white/90 dark:!bg-slate-900/90 !border-slate-200 dark:!border-slate-800/80 !text-slate-800 dark:!text-white rounded-2xl !backdrop-blur-md shadow-2xl" />
        <MiniMap
          nodeColor="#38bdf8"
          maskColor={theme === "dark" ? "rgba(9, 13, 22, 0.75)" : "rgba(241, 245, 249, 0.75)"}
          className="!bg-white/90 dark:!bg-slate-900/90 !border-slate-200 dark:!border-slate-800/80 rounded-2xl !backdrop-blur-md"
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color={theme === "dark" ? "#1e293b" : "#cbd5e1"}
        />
      </ReactFlow>

      {/* Modal Thêm Bước */}
      {showAddStepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="w-full max-w-sm p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl transition-colors duration-150">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Thêm Bước Kiểm Thử Mới
            </h4>
            <form onSubmit={handleAddStepSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên bước trong sơ đồ
                </label>
                <input
                  type="text"
                  required
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  placeholder="VD: Nhấn nút Gửi và Kiểm Tra Thông Báo"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStepModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                  Tạo Bước
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
