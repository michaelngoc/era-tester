"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import {
  Users,
  CheckCircle,
  XCircle,
  Trash2,
  Shield,
  Clock,
  UserCheck,
} from "lucide-react";

export default function AdminUsersPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.user || data.user.role !== "SUPER_ADMIN") {
          window.location.href = "/";
          return;
        }
        setCurrentUser(data.user);
        fetchUsers();
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

  const handleUpdateStatus = async (userId: number, status: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
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
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tài khoản này không?")) return;
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-150">
      <Navbar user={currentUser} />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-amber-500 dark:text-amber-400" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Phê Duyệt & Quản Lý Thành Viên
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Quản trị viên phê duyệt thành viên mới, phân bổ vai trò QA/Dev và gửi email kích hoạt tự động.
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
                  <th className="p-4">Vai Trò</th>
                  <th className="p-4">Trạng Thái</th>
                  <th className="p-4">Ngày Tạo</th>
                  <th className="p-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">
                      {u.full_name || "Chưa đặt tên"}
                    </td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                      {u.email}
                    </td>
                    <td className="p-4">
                      {u.id === currentUser.id ? (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
