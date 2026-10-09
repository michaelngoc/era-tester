import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const res = await query(
      `SELECT h.*, r.title as run_title
       FROM era_tester_case_history h
       LEFT JOIN era_tester_runs r ON r.id = h.run_id
       WHERE h.case_id = $1
       ORDER BY h.created_at DESC`,
      [id]
    );

    return NextResponse.json({ history: res.rows });
  } catch (error: any) {
    console.error("[Get History Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const res = await query(
      `INSERT INTO era_tester_case_history
       (case_id, run_id, actor_id, actor_name, action, from_status, to_status, note, git_commit_hash, evidence_urls, response_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id,
        body.runId || null,
        user.id,
        user.fullName || user.email,
        body.action || "NOTE_ADDED",
        body.fromStatus || null,
        body.toStatus || null,
        body.note || null,
        body.gitCommitHash || null,
        body.evidenceUrls || null,
        body.responsePayload ? JSON.stringify(body.responsePayload) : null,
      ]
    );

    return NextResponse.json({ success: true, historyItem: res.rows[0] });
  } catch (error: any) {
    console.error("[Create History Item Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
