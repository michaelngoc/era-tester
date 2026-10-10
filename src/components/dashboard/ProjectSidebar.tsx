import React from "react";
import {
  FolderGit2,
  Layers,
  Plus,
  Pencil,
  Trash2,
  Users,
  Search,
  X,
  GripVertical,
  ChevronUp,
  ChevronDown,
  GitFork,
} from "lucide-react";

export interface ProjectSidebarProps {
  userRole?: string;
  projects: any[];
  selectedProject: any;
  onSelectProject: (proj: any) => void;
  onOpenCreateProject: () => void;
  onOpenEditProject: (proj: any, e: React.MouseEvent) => void;
  onOpenManageMembers?: (proj: any, e: React.MouseEvent) => void;
  onDeleteProject: (proj: any, e: React.MouseEvent) => void;

  modules: any[];
  selectedModule: any;
  onSelectModule: (mod: any) => void;
  onOpenCreateModule: () => void;
  onOpenEditModule: (mod: any, e: React.MouseEvent) => void;
  onDeleteModule: (mod: any, e: React.MouseEvent) => void;
  onReorderModules?: (orderedModules: any[]) => void;
}

export function ProjectSidebar({
  userRole,
  projects,
  selectedProject,
  onSelectProject,
  onOpenCreateProject,
  onOpenEditProject,
  onOpenManageMembers,
  onDeleteProject,
  modules,
  selectedModule,
  onSelectModule,
  onOpenCreateModule,
  onOpenEditModule,
  onDeleteModule,
  onReorderModules,
}: ProjectSidebarProps) {
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isDev = userRole === "DEVELOPER";
  const [moduleSearch, setModuleSearch] = React.useState("");

  // Drag and drop state
  const [draggedId, setDraggedId] = React.useState<number | null>(null);
  const [dragOverId, setDragOverId] = React.useState<number | null>(null);

  const filteredModules = React.useMemo(() => {
    if (!moduleSearch.trim()) return modules;
    const q = moduleSearch.toLowerCase().trim();
    return modules.filter((m) => {
      const matchName = m.name?.toLowerCase().includes(q);
      const matchPatterns = Array.isArray(m.file_patterns)
        ? m.file_patterns.some((p: string) => p.toLowerCase().includes(q))
        : false;
      const matchTesters = Array.isArray(m.assigned_tester_users)
        ? m.assigned_tester_users.some(
            (u: any) =>
              u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
          )
        : false;
      const matchFlows = Array.isArray(m.flows)
        ? m.flows.some((f: any) => f.title?.toLowerCase().includes(q))
        : false;
      return matchName || matchPatterns || matchTesters || matchFlows;
    });
  }, [modules, moduleSearch]);

  // Reorder handlers
  const handleMoveUp = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = modules.findIndex((m) => m.id === id);
    if (currentIndex <= 0) return;
    const newItems = [...modules];
    const temp = newItems[currentIndex];
    newItems[currentIndex] = newItems[currentIndex - 1];
    newItems[currentIndex - 1] = temp;
    if (onReorderModules) onReorderModules(newItems);
  };

  const handleMoveDown = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = modules.findIndex((m) => m.id === id);
    if (currentIndex < 0 || currentIndex >= modules.length - 1) return;
    const newItems = [...modules];
    const temp = newItems[currentIndex];
    newItems[currentIndex] = newItems[currentIndex + 1];
    newItems[currentIndex + 1] = temp;
    if (onReorderModules) onReorderModules(newItems);
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    if (isDev || moduleSearch.trim()) return;
    e.dataTransfer.setData("text/plain", String(id));
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    if (isDev || moduleSearch.trim()) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    if (isDev || moduleSearch.trim()) return;
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const fromIdx = modules.findIndex((m) => m.id === draggedId);
    const toIdx = modules.findIndex((m) => m.id === targetId);
    if (fromIdx !== -1 && toIdx !== -1) {
      const newItems = [...modules];
      const [moved] = newItems.splice(fromIdx, 1);
      newItems.splice(toIdx, 0, moved);
      if (onReorderModules) onReorderModules(newItems);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <aside className="w-80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/80 flex flex-col shrink-0 transition-colors duration-150">
      {/* Projects Select Section */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Dự Án Đang Kiểm Thử
          </span>
          {!isDev && (
            <button
              onClick={onOpenCreateProject}
              title="Tạo dự án mới"
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 border border-sky-200 dark:border-sky-500/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm</span>
            </button>
          )}
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

                  {/* Quick Edit, Members & Delete Project buttons */}
                  {!isDev && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                      {onOpenManageMembers && (
                        <button
                          type="button"
                          onClick={(e) => onOpenManageMembers(p, e)}
                          title="Phân công thành viên dự án"
                          className="p-1 hover:bg-white/20 rounded transition text-slate-400 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-300"
                        >
                          <Users className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => onOpenEditProject(p, e)}
                        title="Sửa dự án"
                        className="p-1 hover:bg-white/20 rounded transition text-slate-400 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={(e) => onDeleteProject(p, e)}
                          title="Xóa dự án (Chỉ Super Admin)"
                          className="p-1 hover:bg-rose-500/20 rounded transition text-slate-400 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
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
        {/* Header Nhóm Kiểm Thử */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Nhóm Kiểm Thử (Modules)
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800">
              {modules.length}
            </span>
          </div>

          {!isDev && (
            <button
              onClick={onOpenCreateModule}
              title="Tạo nhóm kiểm thử mới"
              disabled={!selectedProject}
              className="flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 disabled:opacity-40 border border-sky-200 dark:border-sky-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm</span>
            </button>
          )}
        </div>

        {/* Search Bar for Modules */}
        {modules.length > 0 && (
          <div className="relative mb-2.5">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={moduleSearch}
              onChange={(e) => setModuleSearch(e.target.value)}
              placeholder="Tìm kiếm nhóm kiểm thử..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
            {moduleSearch && (
              <button
                type="button"
                onClick={() => setModuleSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          {filteredModules.map((m, index) => {
            const isSelected = selectedModule?.id === m.id;
            const isDragging = draggedId === m.id;
            const isOver = dragOverId === m.id;

            // Search matching flows
            const matchingFlows = moduleSearch.trim()
              ? (m.flows || []).filter((f: any) =>
                  f.title?.toLowerCase().includes(moduleSearch.toLowerCase().trim())
                )
              : [];

            return (
              <div
                key={m.id}
                onClick={() => onSelectModule(m)}
                draggable={!isDev && !moduleSearch.trim()}
                onDragStart={(e) => handleDragStart(e, m.id)}
                onDragOver={(e) => handleDragOver(e, m.id)}
                onDrop={(e) => handleDrop(e, m.id)}
                onDragEnd={handleDragEnd}
                className={`group w-full flex items-center justify-between px-2.5 py-2 rounded-2xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-sky-50/80 dark:bg-slate-800/90 text-sky-700 dark:text-sky-300 font-semibold border border-sky-300 dark:border-sky-500/30 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 border border-transparent"
                } ${isOver ? "border-t-2 border-sky-500 bg-sky-50/50 dark:bg-sky-950/30" : ""} ${
                  isDragging ? "opacity-30 scale-95" : ""
                }`}
              >
                <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                  {/* Drag Handle */}
                  {!isDev && !moduleSearch.trim() && (
                    <span
                      title="Kéo thả để sắp xếp vị trí nhóm"
                      className="p-0.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>
                  )}

                  <Layers
                    className={`w-4 h-4 shrink-0 ${
                      isSelected
                        ? "text-sky-600 dark:text-sky-400"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  />
                  <div className="truncate flex-1 min-w-0">
                    <span className="truncate block font-semibold">{m.name}</span>
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

                    {/* Matching User Flows Badge */}
                    {matchingFlows.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {matchingFlows.map((f: any) => (
                          <span
                            key={f.id}
                            className="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.2 rounded-md bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 font-medium"
                          >
                            <GitFork className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate max-w-[130px]">Luồng: {f.title}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-1">
                  {/* Up / Down Reorder Buttons */}
                  {!isDev && !moduleSearch.trim() && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleMoveUp(m.id, e)}
                        disabled={index === 0}
                        title="Di chuyển lên trên"
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleMoveDown(m.id, e)}
                        disabled={index === modules.length - 1}
                        title="Di chuyển xuống dưới"
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

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
                  {!isDev && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => onOpenEditModule(m, e)}
                        title="Sửa nhóm kiểm thử & phân công Tester"
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={(e) => onDeleteModule(m, e)}
                          title="Xóa nhóm kiểm thử (Chỉ Super Admin)"
                          className="p-1 hover:bg-rose-100 dark:hover:bg-slate-700 rounded transition text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {modules.length > 0 && filteredModules.length === 0 && (
            <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl">
              Không tìm thấy nhóm kiểm thử nào khớp với &quot;{moduleSearch}&quot;.
            </div>
          )}

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
