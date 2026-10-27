import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { query } from "./db";
import { getGlobalAdminRoles } from "./permissions";
import { isLegacyJwtSecret } from "./known-default-secrets";

const MIN_JWT_SECRET_BYTES = 32;

// Fail closed: không có giá trị mặc định; đọc lười để `next build` không ném khi thiếu env.
export function getJwtSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw || Buffer.byteLength(raw) < MIN_JWT_SECRET_BYTES) {
    throw new Error(`JWT_SECRET là bắt buộc và phải dài tối thiểu ${MIN_JWT_SECRET_BYTES} byte`);
  }
  if (isLegacyJwtSecret(raw)) {
    throw new Error("JWT_SECRET đang dùng giá trị mặc định cũ đã lộ trong mã nguồn; hãy xoay sang secret mới");
  }
  return new TextEncoder().encode(raw);
}

export type UserRole =
  | "SUPER_ADMIN"
  | "CEO"
  | "CTO"
  | "LEADER"
  | "PM"
  | "PO"
  | "BA"
  | "QA"
  | "QC"
  | "TESTER"
  | "DEVELOPER"
  | "SALES"
  | "MEMBER";

export interface UserSession {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  status: "PENDING" | "ACTIVE" | "BANNED" | "INACTIVE";
  isGlobalAdmin: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: UserSession): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    isGlobalAdmin: user.isGlobalAdmin,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  const secret = getJwtSecret(); // thiếu/ngắn thì ném lỗi, không nuốt thành "chưa đăng nhập"
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as UserSession;
  } catch {
    return null;
  }
}

export const getCurrentUser = cache(async (): Promise<UserSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("era_tester_session")?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  // Refresh latest status from database
  // Roles toàn quyền không phụ thuộc user nên chạy song song với query user
  const [res, globalAdminRoles] = await Promise.all([
    query(
      "SELECT id, email, full_name, role, status FROM era_tester_users WHERE id = $1 LIMIT 1",
      [session.id]
    ),
    getGlobalAdminRoles(),
  ]);
  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  const isGlobal = row.role === "SUPER_ADMIN" || globalAdminRoles.includes(row.role);

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name || "",
    role: row.role,
    status: row.status,
    isGlobalAdmin: isGlobal,
  };
});
