import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { query } from "./db";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "eraweb_tester_hub_jwt_super_secure_secret_2026"
);

export interface UserSession {
  id: number;
  email: string;
  fullName: string;
  role: "SUPER_ADMIN" | "MEMBER";
  status: "PENDING" | "ACTIVE" | "BANNED";
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
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserSession;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("era_tester_session")?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  // Refresh latest status from database
  const res = await query(
    "SELECT id, email, full_name, role, status FROM era_tester_users WHERE id = $1 LIMIT 1",
    [session.id]
  );
  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name || "",
    role: row.role,
    status: row.status,
  };
}
