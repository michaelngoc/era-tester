"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import {
  Users,
  CheckCircle,
  XCircle,
  Trash2,
  Shield,
  ShieldCheck,
  Clock,
  UserCheck,
  Save,
  KeyRound,
  Sparkles,
  Info,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface RoleOption {
  role: string;
  label: string;
  group: string;
  description: string;
  isImmutable?: boolean;
}

export default function AdminUsersPage() {
  const { toast, confirm } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cấu hình các vai trò có toàn quyền Super Admin
  const [allowedGlobalRoles, setAllowedGlobalRoles] = useState<string[]>(["SUPER_ADMIN"]);
  const [allRoles, setAllRoles] = useState<RoleOption[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [rolesSavedMessage, setRolesSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.user || (!data.user.isGlobalAdmin && data.user.role !== "SUPER_ADMIN")) {
          window.location.href = "/";
          return;
        }
        setCurrentUser(data.user);
        fetchUsers();
        fetchGlobalRoles();
      });
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data?.users) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalRoles = async () => {
    try {
      const res = await fetch("/api/admin/settings/roles");
      const data = await res.json();
      if (data?.success) {
        setAllowedGlobalRoles(data.allowedRoles || ["SUPER_ADMIN"]);
        setAllRoles(data.allRoles || []);
      }
    } catch (e) {
      console.error("[fetchGlobalRoles Error]", e);
    }
  };

  const handleToggleGlobalRole = (role: string) => {
    if (role === "SUPER_ADMIN") return; // Super Admin là bất biến

    setAllowedGlobalRoles((prev) => {
      if (prev.includes(role)) {
        return prev.filter((r) => r !== role);
      } else {
        return [...prev, role];
      }
    });
    setRolesSavedMessage(null);
  };

  const handleSaveGlobalRoles = async () => {
    setSavingRoles(true);
    setRolesSavedMessage(null);
    try {
      const res = await fetch("/api/admin/settings/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: allowedGlobalRoles }),
      });
      const data = await res.json();
      if (data.success) {
        setAllowedGlobalRoles(data.allowedRoles);
        toast.success("Đã lưu cấu hình vai trò toàn quyền thành công!");
      } else {
        toast.error(data.error || "Không thể lưu cấu hình");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Đã xảy ra lỗi khi lưu cấu hình: " + e.message);
    } finally {
      setSavingRoles(false);
    }
  };

  const handleUpdateStatus = async (userId: number, status: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã cập nhật trạng thái người dùng sang ${status}`);
        fetchUsers();
      } else {
        toast.error(data.error || "Không thể cập nhật trạng thái");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Lỗi cập nhật trạng thái: " + e.message);
    }
  };

  const handleUpdateRole = async (userId: number, role: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã chuyển đổi vai trò người dùng sang ${role}`);
        fetchUsers();
      } else {
        toast.error(data.error || "Không thể cập nhật vai trò");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Lỗi cập nhật vai trò: " + e.message);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const ok = await confirm({
      title: "Xóa tài khoản người dùng",
      message: "Bạn có chắc chắn muốn xóa tài khoản này không? Hành động này không thể hoàn tác.",
      confirmText: "Xóa tài khoản",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Đã xóa tài khoản người dùng thành công");
        fetchUsers();
      } else {
        toast.error(data.error || "Không thể xóa tài khoản");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Lỗi kết nối khi xóa tài khoản: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-150">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-10">
        {/* SECTION 1: CẤU HÌNH VAI TRÒ TOÀN QUYỀN NHƯ SUPER ADMIN */}
        <section className="rounded-3xl border border-amber-200/80 dark:border-amber-500/20 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/20 dark:from-amber-950/20 dark:via-slate-900/40 dark:to-slate-900/60 p-6 md:p-8 shadow-xl shadow-amber-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-amber-200/60 dark:border-amber-500/20">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Tùy Chọn Vị Trí / Vai Trò Có Toàn Quyền Quản Trị
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  Global Super Admin Rights
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
                Các vị trí được bật quyền này sẽ có <strong>toàn quyền như Super Admin</strong>: Tự động thấy, quản trị, thêm/sửa/xóa 
                tất cả các dự án, nhóm kiểm thử, User Flow và phê duyệt thành viên mà không cần phải gán thủ công vào từng dự án.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {rolesSavedMessage && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 animate-in fade-in">
                  <Sparkles className="w-3.5 h-3.5" />
                  {rolesSavedMessage}
                </span>
              )}
              <button
                onClick={handleSaveGlobalRoles}
                disabled={savingRoles}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-amber-600/20 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {savingRoles ? "Đang lưu..." : "Lưu Cấu Hình Quyền"}
              </button>
            </div>
          </div>

          {/* GRID CÁC VAI TRÒ */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {allRoles.map((r) => {
              const isSelected = allowedGlobalRoles.includes(r.role);
              const isImmutable = r.isImmutable || r.role === "SUPER_ADMIN";

              return (
                <div
                  key={r.role}
                  onClick={() => !isImmutable && handleToggleGlobalRole(r.role)}
                  className={`relative p-4 rounded-2xl border transition-all select-none ${
                    isImmutable
                      ? "bg-amber-500/10 border-amber-500/40 text-slate-900 dark:text-white cursor-not-allowed shadow-sm"
                      : isSelected
                      ? "bg-amber-50/80 dark:bg-amber-500/10 border-amber-400 dark:border-amber-500/40 text-slate-900 dark:text-white cursor-pointer shadow-sm hover:border-amber-500"
                      : "bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-amber-500 border-amber-500 text-white"
                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        }`}
                      >
                        {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                      </div>
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {r.label}
                      </span>
                    </div>

                    {isImmutable ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        Cố định
                      </span>
                    ) : isSelected ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300">
                        Toàn quyền
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Theo Project
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {r.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              Lưu ý: Vai trò nào <strong>chưa được chọn</strong> ở trên sẽ chỉ thấy và thao tác được trên các dự án mà họ được thêm vào làm thành viên.
            </span>
          </div>
        </section>

        {/* SECTION 2: PHÊ DUYỆT & QUẢN LÝ THÀNH VIÊN */}
        <section className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-500 dark:text-sky-400" />
                <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Phê Duyệt & Phân Bổ Thành Viên
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Quản trị viên phê duyệt thành viên mới, phân bổ vai trò chuyên môn (QA, QC, Dev, CTO, Leader...) và kiểm soát trạng thái hoạt động.
              </p>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Tổng số tài khoản: <strong className="text-slate-900 dark:text-white">{users.length}</strong>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs text-slate-500">Đang tải danh sách người dùng...</div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-xl transition-colors duration-150">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Họ và Tên</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Vai Trò & Quyền Hạn</th>
                    <th className="p-4">Trạng Thái</th>
                    <th className="p-4">Ngày Tạo</th>
                    <th className="p-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {users.map((u) => {
                    const hasGlobalAccess = allowedGlobalRoles.includes(u.role);

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span>{u.full_name || "Chưa đặt tên"}</span>
                            {hasGlobalAccess && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                <KeyRound className="w-2.5 h-2.5" />
                                Toàn Quyền
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                          {u.email}
                        </td>
                        <td className="p-4">
                          {u.id === currentUser.id && u.role === "SUPER_ADMIN" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <Shield className="w-3 h-3" />
                              Quản Trị Tối Cao
                            </span>
                          ) : (
                            <div className="relative inline-block">
                              <select
                                value={u.role || "TESTER"}
                                onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border focus:outline-none cursor-pointer transition ${
                                  u.role === "SUPER_ADMIN" || u.role === "CTO"
                                    ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30"
                                    : u.role === "DEVELOPER"
                                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/30"
                                    : u.role === "QA" || u.role === "QC" || u.role === "TESTER"
                                    ? "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-500/30"
                                    : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30"
                                }`}
                              >
                                <optgroup label="Kiểm Thử & Đảm Bảo Chất Lượng">
                                  <option value="QA" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                    QA (Đảm Bảo Chất Lượng)
                                  </option>
                                  <option value="QC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                    QC (Kiểm Soát Chất Lượng)
                                  </option>
                                  <option value="TESTER" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                    Tester (Kiểm Thử Viên)
                                  </option>
                                </optgroup>

                                <optgroup label="Kỹ Thuật & Phát Triển">
                                  <option value="DEVELOPER" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                    Developer (Lập Trình Viên)
                                  </option>
                                  <option value="LEADER" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                    Leader (Trưởng Nhóm / Lead)
                                  </option>
                                  <option value="CTO" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                    CTO (Giám Đốc Công Nghệ)
                                  </option>
                                </optgroup>

                                <optgroup label="Sản Phẩm & Quản Lý Dự Án">
                                  <option value="PM" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                    PM (Quản Lý Dự Án)
                                  </option>
                                  <option value="PO" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                    PO (Chủ Sản Phẩm)
                                  </option>
                                  <option value="BA" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                    BA (Phân Tích Nghiệp Vụ)
                                  </option>
                                </optgroup>

                                <optgroup label="Quản Trị Hệ Thống">
                                  <option value="SUPER_ADMIN" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                    Super Admin (Quản Trị Tối Cao)
                                  </option>
                                  <option value="MEMBER" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                    Member (Thành Viên Xem)
                                  </option>
                                </optgroup>
                              </select>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {u.status === "ACTIVE" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Đã Duyệt
                            </span>
                          ) : u.status === "PENDING" ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                              <Clock className="w-3.5 h-3.5" />
                              Chờ Duyệt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              Bị Khóa
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-500">
                          {new Date(u.created_at).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {u.status === "PENDING" && (
                            <button
                              onClick={() => handleUpdateStatus(u.id, "ACTIVE")}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition shadow-sm cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Duyệt
                            </button>
                          )}

                          {u.status === "ACTIVE" && u.role !== "SUPER_ADMIN" && (
                            <button
                              onClick={() => handleUpdateStatus(u.id, "BANNED")}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                            >
                              Khóa
                            </button>
                          )}

                          {u.status === "BANNED" && (
                            <button
                              onClick={() => handleUpdateStatus(u.id, "ACTIVE")}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-600/30 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white transition cursor-pointer"
                            >
                              Mở Khóa
                            </button>
                          )}

                          {u.id !== currentUser.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                              title="Xóa tài khoản"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
