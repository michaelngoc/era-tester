import { NextRequest, NextResponse } from "next/server";
import { processGitPushImpact } from "@/lib/git-impact";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Kiểm tra branch có phải là 'tester' hay không
    const ref = payload.ref || "";
    const branch = ref.replace("refs/heads/", "");

    if (branch !== "tester") {
      return NextResponse.json({
        ignored: true,
        message: `Bỏ qua webhook: branch '${branch}' không phải là branch 'tester'`,
      });
    }

    // Tập hợp danh sách các file đã thay đổi từ toàn bộ commits trong đợt push
    const commits = payload.commits || [];
    const modifiedFilesSet = new Set<string>();

    for (const commit of commits) {
      (commit.added || []).forEach((f: string) => modifiedFilesSet.add(f));
      (commit.modified || []).forEach((f: string) => modifiedFilesSet.add(f));
      (commit.removed || []).forEach((f: string) => modifiedFilesSet.add(f));
    }

    const modifiedFiles = Array.from(modifiedFilesSet);
    const headCommit = payload.head_commit || commits[0] || {};
    const commitHash = headCommit.id || "manual-push";
    const commitMessage = headCommit.message || "Push to tester branch";
    const authorName = headCommit.author?.name || payload.pusher?.name || "Dev";
    const authorEmail = headCommit.author?.email || payload.pusher?.email || "";

    const result = await processGitPushImpact({
      commitHash,
      commitMessage,
      authorName,
      authorEmail,
      branch,
      modifiedFiles,
    });

    return NextResponse.json({
      success: true,
      message: `Đã xử lý commit ${commitHash.slice(0, 7)} trên nhánh ${branch}`,
      impactedCount: result.impactedCount,
      impactedModules: result.impactedModules,
    });
  } catch (error: any) {
    console.error("[GitHub Webhook Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
