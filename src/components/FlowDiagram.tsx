"use client";

import React, { useCallback, useMemo } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TestCase } from "./CaseDetailModal";
import { GitCommit, AlertCircle, CheckCircle2, Wrench, Eye } from "lucide-react";

interface FlowDiagramProps {
  cases: TestCase[];
  onSelectCase: (testCase: TestCase) => void;
  onSaveFlow?: (nodes: Node[], edges: Edge[]) => void;
}

// Custom Node Component hiển thị trực quan trạng thái kiểm thử
function TestStepNode({ data }: { data: any }) {
  const { title, testCase, onSelect } = data;
  const status = testCase?.status || "NEW";
  const isGitImpacted = testCase?.is_impacted_by_git;

  const statusMap: Record<string, { color: string; icon: any; label: string }> = {
    NEW: { color: "border-rose-500/80 bg-rose-950/40 text-rose-300", icon: AlertCircle, label: "Bug / New" },
    FIX: { color: "border-sky-500/80 bg-sky-950/40 text-sky-300", icon: Wrench, label: "Fixing" },
    VERIFY: { color: "border-purple-500/80 bg-purple-950/40 text-purple-300", icon: Eye, label: "Verifying" },
    CLOSED: { color: "border-emerald-500/80 bg-emerald-950/40 text-emerald-300", icon: CheckCircle2, label: "Passed" },
  };

  const statusConfig = statusMap[status] || { color: "border-slate-700 bg-slate-900 text-slate-300", icon: AlertCircle, label: status };

  const Icon = statusConfig.icon;

  return (
    <div
      onClick={() => onSelect && onSelect(testCase)}
      className={`min-w-[180px] max-w-[220px] rounded-xl border-2 p-3 shadow-xl backdrop-blur-md cursor-pointer transition hover:scale-105 ${statusConfig.color}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2.5 !h-2.5" />

      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono opacity-80">#{testCase?.id || "?"}</span>
        <div className="flex items-center gap-1">
          {isGitImpacted && (
            <span className="flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-950 animate-pulse">
              <GitCommit className="w-2.5 h-2.5" />
              Git
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
            <Icon className="w-3 h-3" />
            {statusConfig.label}
          </span>
        </div>
      </div>

      <div className="font-semibold text-xs text-white line-clamp-2">
        {title || testCase?.title || "Bước Kiểm Thử"}
      </div>

      {testCase?.actual_result && (
        <div className="mt-1.5 text-[10px] text-rose-300/90 line-clamp-1 italic">
          ⚠️ {testCase.actual_result}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2.5 !h-2.5" />
    </div>
  );
}

export default function FlowDiagram({
  cases,
  onSelectCase,
  onSaveFlow,
}: FlowDiagramProps) {
  const nodeTypes = useMemo(() => ({ testStep: TestStepNode }), []);

  // Tự động sinh nodes từ danh sách test cases
  const initialNodes: Node[] = useMemo(() => {
    return cases.map((c, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      return {
        id: `node-${c.id}`,
        type: "testStep",
        position: { x: col * 260 + 50, y: row * 160 + 50 },
        data: {
          title: c.title,
          testCase: c,
          onSelect: onSelectCase,
        },
      };
    });
  }, [cases, onSelectCase]);

  // Sinh edges liên kết tuần tự
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    for (let i = 0; i < cases.length - 1; i++) {
      edges.push({
        id: `edge-${cases[i].id}-${cases[i + 1].id}`,
        source: `node-${cases[i].id}`,
        target: `node-${cases[i + 1].id}`,
        animated: cases[i].is_impacted_by_git || cases[i + 1].is_impacted_by_git,
        style: { stroke: "#38bdf8", strokeWidth: 2 },
      });
    }
    return edges;
  }, [cases]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-full min-h-[500px] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Pass
        </span>
        <span className="flex items-center gap-1.5 text-rose-400 ml-2">
          <span className="w-2 h-2 rounded-full bg-rose-500" /> Bug
        </span>
        <span className="flex items-center gap-1.5 text-amber-400 ml-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Git Changed
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
        <Controls className="!bg-slate-900 !border-slate-800 !text-white rounded-xl" />
        <MiniMap
          nodeColor="#38bdf8"
          maskColor="rgba(11, 15, 25, 0.7)"
          className="!bg-slate-900 !border-slate-800 rounded-xl"
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
      </ReactFlow>
    </div>
  );
}
