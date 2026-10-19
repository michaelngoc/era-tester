import { NextRequest, NextResponse } from "next/server";
import { processGitPushImpact, type GitCommitInfo } from "@/lib/git-impact";
import { verifyGithubSignature } from "@/lib/github-signature";

interface GitHubCommit {
  id?: string;
  message?: string;
  author?: { name?: string; email?: string };
  added?: string[];
  modified?: string[];
  removed?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Webhook chưa cấu hình GITHUB_WEBHOOK_SECRET" }, { status: 503 });
    }

    const rawBody = await req.text();
    if (!verifyGithubSignature(rawBody, req.headers.get("x-hub-signature-256"), secret)) {
      return NextResponse.json({ error: "Chữ ký webhook không hợp lệ" }, { status: 401 });
    }

    const event = req.headers.get("x-github-event");
    if (event === "ping") {
      return NextResponse.json({ ok: true, message: "pong" });
    }
    if (event !== "push") {
      return NextResponse.json({ ignored: true, message: `Bỏ qua event '${event}': chỉ nhận push` });
    }

    const payload = JSON.parse(rawBody);

    // Kiểm tra branch có phải là 'tester' hay không
    const ref = payload.ref || "";
    const branch = ref.replace("refs/heads/", "");

    if (branch !== "tester") {
      return NextResponse.json({
        ignored: true,
        message: `Bỏ qua webhook: branch '${branch}' không phải là branch 'tester'`,
      });
    }

    // Xử lý từng commit trong đợt push (GitHub cắt tối đa 20 commit; luôn có head_commit)
    const rawCommits: GitHubCommit[] = payload.commits?.length
      ? payload.commits
      : payload.head_commit
        ? [payload.head_commit]
        : [];

    const commits: GitCommitInfo[] = rawCommits.map((c) => ({
      hash: c.id || "manual-push",
      message: c.message || "",
      authorName: c.author?.name || payload.pusher?.name || "Dev",
      authorEmail: c.author?.email || payload.pusher?.email || "",
      files: [...(c.added || []), ...(c.modified || []), ...(c.removed || [])],
    }));

    const result = await processGitPushImpact({
      commits,
      branch,
      repoFullName: payload.repository?.full_name || "",
    });

    return NextResponse.json({
      success: true,
      message: `Đã xử lý ${commits.length} commit trên nhánh ${branch} (bỏ qua ${result.skippedCommits} commit không thuộc feat/fix/perf/refactor)`,
      impactedCount: result.impactedCount,
      impactedModules: result.impactedModules,
      referencedCases: result.referencedCases,
      movedCases: result.movedCases,
      skippedCases: result.skippedCases,
    });
  } catch (error: any) {
    console.error("[GitHub Webhook Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
