@AGENTS.md

## Git Workflow (BẮT BUỘC)

Đọc `GIT_WORKFLOW.md` (cùng thư mục) trước mọi lệnh git ghi. Repo `tester` dùng nhánh `master` và **không** có tester gate (Hub không tự test chính nó); các quy tắc còn lại giữ nguyên:

- Làm trên nhánh `type/mô-tả`, PR vào `master`. Không commit/push thẳng `master`.
- Commit: `<type>(<scope>): <mô tả>`. Type hợp lệ: feat, fix, perf, refactor, style, docs, test, chore, ci, revert. Nguồn sự thật của type: `src/lib/commit-types.ts` — đổi ở đó phải cập nhật `GIT_WORKFLOW.md` ở cả 3 repo + root và chạy `npx tsc --noEmit`.
- Rebase `origin/master` trước PR; push bằng `--force-with-lease --force-if-includes`. Cấm `push -f`, `reset --hard`, `clean -fd`, `branch -D` trừ khi người dùng ra lệnh rõ ràng.
- Chỉ commit/push/mở PR khi người dùng yêu cầu. Không `--no-verify`.
