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
  Filter,
  Sparkles,
  Maximize2,
} from "lucide-react";

interface FlowDiagramProps {
  cases: TestCase[];
  onSelectCase: (testCase: TestCase) => void;
  onSaveFlow?: (nodes: Node[], edges: Edge[]) => void;
}

// Custom Node Component chuẩn UI-UX Pro Max (Zero Emojis, Pure SVG & Micro-interactions)
function TestStepNode({ data }: { data: any }) {
  const { title, testCase, onSelect } = data;
  const status = testCase?.status || "NEW";
  const isGitImpacted = testCase?.is_impacted_by_git;

  const statusMap: Record<
    string,
    {
      border: string;
      bg: string;
      text: string;
      icon: any;
      label: string;
      badgeBg: string;
    }
  > = {
    NEW: {
      border: "border-rose-500/80 hover:border-rose-400 hover:shadow-rose-500/20",
      bg: "bg-slate-900/90",
      text: "text-rose-400",
      icon: AlertCircle,
      label: "Bug / Open",
      badgeBg: "bg-rose-500/15 border-rose-500/30 text-rose-300",
    },
    FIX: {
      border: "border-sky-500/80 hover:border-sky-400 hover:shadow-sky-500/20",
      bg: "bg-slate-900/90",
      text: "text-sky-400",
      icon: Wrench,
      label: "Fixing",
      badgeBg: "bg-sky-500/15 border-sky-500/30 text-sky-300",
    },
    VERIFY: {
      border: "border-purple-500/80 hover:border-purple-400 hover:shadow-purple-500/20",
      bg: "bg-slate-900/90",
      text: "text-purple-400",
      icon: Eye,
      label: "Verifying",
      badgeBg: "bg-purple-500/15 border-purple-500/30 text-purple-300",
    },
    CLOSED: {
      border: "border-emerald-500/80 hover:border-emerald-400 hover:shadow-emerald-500/20",
      bg: "bg-slate-900/90",
      text: "text-emerald-400",
      icon: CheckCircle2,
      label: "Passed",
      badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    },
  };

  const current = statusMap[status] || statusMap.NEW;
  const Icon = current.icon;

  return (
    <div
      onClick={() => onSelect && onSelect(testCase)}
      className={`group relative min-w-[210px] max-w-[240px] rounded-2xl border-2 p-3.5 shadow-2xl backdrop-blur-xl transition-all duration-200 cursor-pointer hover:-translate-y-1 ${current.border} ${current.bg}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-400 !w-3 !h-3 !border-2 !border-slate-900"
      />

      {/* Header bar: ID + Status + Git Alert */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
          #{testCase?.id || "?"}
        </span>

        <div className="flex items-center gap-1.5">
          {isGitImpacted && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
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

      {/* Title */}
      <div className="font-semibold text-xs text-slate-100 group-hover:text-white transition line-clamp-2 leading-relaxed">
        {title || testCase?.title || "Kịch Bản Kiểm Thử"}
      </div>

      {/* Actual Result Error Notice */}
      {testCase?.actual_result && (
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-start gap-1.5 text-[10.5px] text-rose-300/90 line-clamp-2">
          <AlertCircle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
          <span className="italic">{testCase.actual_result}</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-400 !w-3 !h-3 !border-2 !border-slate-900"
      />
    </div>
  );
}

export default function FlowDiagram({
  cases,
  onSelectCase,
}: FlowDiagramProps) {
  const [filterMode, setFilterMode] = useState<"all" | "bugs" | "git">("all");

  const filteredCases = useMemo(() => {
    if (filterMode === "bugs") return cases.filter((c) => c.status === "NEW");
    if (filterMode === "git") return cases.filter((c) => c.is_impacted_by_git);
    return cases;
  }, [cases, filterMode]);

  const nodeTypes = useMemo(() => ({ testStep: TestStepNode }), []);

  // Tự động sinh nodes
  const initialNodes: Node[] = useMemo(() => {
    return filteredCases.map((c, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      return {
        id: `node-${c.id}`,
        type: "testStep",
        position: { x: col * 280 + 60, y: row * 180 + 70 },
        data: {
          title: c.title,
          testCase: c,
          onSelect: onSelectCase,
        },
      };
    });
  }, [filteredCases, onSelectCase]);

  // Sinh edges liên kết
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (let i = 0; i < filteredCases.length - 1; i++) {
      const isUrgent =
        filteredCases[i].is_impacted_by_git ||
        filteredCases[i + 1].is_impacted_by_git ||
        filteredCases[i].status === "NEW";

      edges.push({
        id: `edge-${filteredCases[i].id}-${filteredCases[i + 1].id}`,
        source: `node-${filteredCases[i].id}`,
        target: `node-${filteredCases[i + 1].id}`,
        animated: isUrgent,
        style: {
          stroke: isUrgent ? "#f59e0b" : "#0284c7",
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isUrgent ? "#f59e0b" : "#0284c7",
          width: 16,
          height: 16,
        },
      });
    }
    return edges;
  }, [filteredCases]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state when filteredCases change
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-full min-h-[540px] rounded-2xl border border-slate-800/80 bg-slate-950 overflow-hidden relative shadow-inner">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 p-1.5 rounded-2xl shadow-xl text-xs">
        <button
          onClick={() => setFilterMode("all")}
          className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
            filterMode === "all"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          Tất cả ({cases.length})
        </button>

        <button
          onClick={() => setFilterMode("bugs")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
            filterMode === "bugs"
              ? "bg-rose-600 text-white shadow-sm"
              : "text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Chỉ xem Lỗi ({cases.filter((c) => c.status === "NEW").length})
        </button>

        <button
          onClick={() => setFilterMode("git")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
            filterMode === "git"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-amber-400 hover:text-amber-300 hover:bg-amber-950/30"
          }`}
        >
          <GitCommit className="w-3.5 h-3.5" />
          Cần Test Lại Do Git ({cases.filter((c) => c.is_impacted_by_git).length})
        </button>
      </div>

      {/* Legend Badge Bar at top right */}
      <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center gap-3 bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 px-3.5 py-2 rounded-2xl text-[11px] font-medium shadow-xl">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          Passed
        </span>
        <span className="flex items-center gap-1.5 text-rose-400">
          <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
          Bug
        </span>
        <span className="flex items-center gap-1.5 text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50" />
          Git Changed
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
      >
        <Controls className="!bg-slate-900/90 !border-slate-800/80 !text-white rounded-2xl !backdrop-blur-md shadow-2xl" />
        <MiniMap
          nodeColor={(n) => {
            const status = (n.data as any)?.testCase?.status;
            if (status === "CLOSED") return "#10b981";
            if (status === "NEW") return "#f43f5e";
            if (status === "FIX") return "#38bdf8";
            return "#a855f7";
          }}
          maskColor="rgba(9, 13, 22, 0.75)"
          className="!bg-slate-900/90 !border-slate-800/80 rounded-2xl !backdrop-blur-md"
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#1e293b" />
      </ReactFlow>
    </div>
  );
}
