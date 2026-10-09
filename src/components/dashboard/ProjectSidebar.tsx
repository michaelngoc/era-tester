"use client";

import React from "react";
import { FolderGit2, Layers, Plus, Pencil, Trash2 } from "lucide-react";

export interface ProjectSidebarProps {
  projects: any[];
  selectedProject: any;
  onSelectProject: (proj: any) => void;
  onOpenCreateProject: () => void;
  onOpenEditProject: (proj: any, e: React.MouseEvent) => void;
  onDeleteProject: (proj: any, e: React.MouseEvent) => void;

  modules: any[];
  selectedModule: any;
  onSelectModule: (mod: any) => void;
  onOpenCreateModule: () => void;
  onOpenEditModule: (mod: any, e: React.MouseEvent) => void;
  onDeleteModule: (mod: any, e: React.MouseEvent) => void;
}

export function ProjectSidebar({
  projects,
  selectedProject,
  onSelectProject,
  onOpenCreateProject,
  onOpenEditProject,
  onDeleteProject,
  modules,
  selectedModule,
  onSelectModule,
  onOpenCreateModule,
  onOpenEditModule,
  onDeleteModule,
}: ProjectSidebarProps) {
  return (
    <aside className="w-80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/80 flex flex-col shrink-0 transition-colors duration-150">
      {/* Projects Select Section */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Dự Án Đang Kiểm Thử
          </span>
          <button
            onClick={onOpenCreateProject}
            title="Tạo dự án mới"
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 border border-sky-200 dark:border-sky-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm</span>
          </button>
        </div>

        <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
          {projects.map((p) => {
            const isActive = selectedProject?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelectProject(p)}
                className={`group w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/25 border border-sky-400/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FolderGit2
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-white" : "text-sky-500 dark:text-sky-400"
                    }`}
                  />
                  <span className="truncate">{p.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {p.new_bugs > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-sm">
                      {p.new_bugs}
                    </span>
                  )}

                  {/* Quick Edit & Delete Project buttons */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => onOpenEditProject(p, e)}
                      title="Sửa dự án"
                      className="p-1 hover:bg-white/20 rounded transition text-slate-400 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => onDeleteProject(p, e)}
                      title="Xóa dự án"
                      className="p-1 hover:bg-rose-500/20 rounded transition text-slate-400 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {projects.length === 0 && (
            <div className="text-center py-4 text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl">
              Chưa có dự án nào. Bấm &quot;Thêm&quot; để tạo.
            </div>
          )}
        </div>
      </div>

      {/* Modules List Section */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Nhóm Kiểm Thử (Modules)
          </span>

          <button
            onClick={onOpenCreateModule}
            title="Tạo nhóm kiểm thử mới"
            disabled={!selectedProject}
            className="flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 disabled:opacity-40 border border-sky-200 dark:border-sky-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm</span>
          </button>
        </div>

        <div className="space-y-1.5">
          {modules.map((m) => {
            const isSelected = selectedModule?.id === m.id;
            return (
              <div
                key={m.id}
                onClick={() => onSelectModule(m)}
                className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-sky-50/80 dark:bg-slate-800/90 text-sky-700 dark:text-sky-300 font-semibold border border-sky-300 dark:border-sky-500/30 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers
                    className={`w-4 h-4 shrink-0 ${
                      isSelected
                        ? "text-sky-600 dark:text-sky-400"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  />
                  <div className="truncate">
                    <span className="truncate block">{m.name}</span>
                    {m.assigned_tester_users && m.assigned_tester_users.length > 0 && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                        QA:{" "}
                        {m.assigned_tester_users
                          .map(
                            (u: any) =>
                              u.name?.split(" ").slice(-1)[0] ||
                              u.email.split("@")[0]
                          )
                          .join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {m.count_git_impacted > 0 && (
                    <span
                      className="flex h-2 w-2 relative"
                      title="Có commit Git thay đổi cần kiểm lại"
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    {m.total_cases || 0}
                  </span>

                  {/* Edit & Delete Module buttons */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => onOpenEditModule(m, e)}
                      title="Sửa nhóm kiểm thử & phân công Tester"
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => onDeleteModule(m, e)}
                      title="Xóa nhóm kiểm thử"
                      className="p-1 hover:bg-rose-100 dark:hover:bg-slate-700 rounded transition text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {modules.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl">
              Chưa có nhóm kiểm thử nào.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
