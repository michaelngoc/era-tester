import "server-only";
import { query } from "./db";
import { UserRole } from "./auth";

export interface RoleDefinition {
  role: UserRole;
  label: string;
  group: "Quản Trị" | "Kỹ Thuật" | "Sản Phẩm" | "Kiểm Thử" | "Khác";
  description: string;
  isImmutable?: boolean; // SUPER_ADMIN luôn có toàn quyền, không thể tắt
}

export const ALL_SYSTEM_ROLES: RoleDefinition[] = [
  {
    role: "SUPER_ADMIN",
    label: "Super Admin (Quản Trị Tối Cao)",
    group: "Quản Trị",
    description: "Toàn quyền quản trị cao nhất của hệ thống, không thể thu hồi.",
    isImmutable: true,
  },
  {
    role: "CTO",
    label: "CTO (Giám Đốc Công Nghệ)",
    group: "Kỹ Thuật",
    description: "Lãnh đạo kỹ thuật, giám sát toàn diện kiến trúc và tất cả các dự án.",
  },
  {
    role: "LEADER",
    label: "Leader (Trưởng Nhóm / Tech Lead)",
    group: "Kỹ Thuật",
    description: "Trưởng nhóm phụ trách kỹ thuật, quản lý phân công task.",
  },
  {
    role: "PM",
    label: "PM (Quản Lý Dự Án)",
    group: "Sản Phẩm",
    description: "Quản lý tiến độ phát hành và điều phối tài nguyên dự án.",
  },
  {
    role: "PO",
    label: "PO (Chủ Sản Phẩm)",
    group: "Sản Phẩm",
    description: "Định hướng tính năng, phạm vi và mục tiêu sản phẩm.",
  },
  {
    role: "BA",
    label: "BA (Phân Tích Nghiệp Vụ)",
    group: "Sản Phẩm",
    description: "Phân tích yêu cầu và quy trình nghiệp vụ phần mềm.",
  },
  {
    role: "QA",
    label: "QA (Đảm Bảo Chất Lượng)",
    group: "Kiểm Thử",
    description: "Đảm bảo chất lượng quy trình kiểm thử và tiêu chuẩn xuất xưởng.",
  },
  {
    role: "QC",
    label: "QC (Kiểm Soát Chất Lượng)",
    group: "Kiểm Thử",
    description: "Kiểm soát chi tiết lỗi phần mềm và xác nhận kịch bản kiểm thử.",
  },
  {
    role: "TESTER",
    label: "Tester (Kiểm Thử Viên)",
    group: "Kiểm Thử",
    description: "Trực tiếp thực thi kiểm thử và báo cáo kết quả thực tế.",
  },
  {
    role: "DEVELOPER",
    label: "Developer (Lập Trình Viên)",
    group: "Kỹ Thuật",
    description: "Lập trình viên phát triển tính năng và sửa lỗi.",
  },
  {
    role: "MEMBER",
    label: "Member (Thành Viên)",
    group: "Khác",
    description: "Thành viên thông thường trong hệ thống.",
  },
];

export const DEFAULT_GLOBAL_ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN"];

/**
 * Lấy danh sách các vai trò có toàn quyền quản trị như Super Admin từ cơ sở dữ liệu
 */
export async function getGlobalAdminRoles(): Promise<UserRole[]> {
  try {
    const res = await query(
      "SELECT value FROM era_tester_settings WHERE key = 'global_admin_roles' LIMIT 1"
    );
    if (res.rows.length > 0 && Array.isArray(res.rows[0].value)) {
      const roles = res.rows[0].value as UserRole[];
      if (!roles.includes("SUPER_ADMIN")) {
        roles.unshift("SUPER_ADMIN");
      }
      return roles;
    }
  } catch (error) {
    console.error("[Permissions] Failed to fetch global_admin_roles:", error);
  }
  return DEFAULT_GLOBAL_ADMIN_ROLES;
}

/**
 * Kiểm tra xem một vai trò có quyền quản trị toàn cục hay không
 */
export async function isGlobalAdminRole(role?: string | null): Promise<boolean> {
  if (!role) return false;
  if (role === "SUPER_ADMIN") return true;

  const allowedRoles = await getGlobalAdminRoles();
  return allowedRoles.includes(role as UserRole);
}

/**
 * Cập nhật danh sách các vai trò có toàn quyền quản trị
 */
export async function updateGlobalAdminRoles(
  roles: UserRole[],
  updatedByUserId?: number
): Promise<UserRole[]> {
  const sanitizedRoles = Array.from(new Set(["SUPER_ADMIN" as UserRole, ...roles]));

  await query(
    `INSERT INTO era_tester_settings (key, value, description, updated_at, updated_by)
     VALUES ('global_admin_roles', $1, 'Danh sách các vai trò có toàn quyền như Super Admin', NOW(), $2)
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [JSON.stringify(sanitizedRoles), updatedByUserId || null]
  );

  return sanitizedRoles;
}
