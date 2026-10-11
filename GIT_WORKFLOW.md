# Git Workflow Eraweb — `manage` · `client` · `tester`

> **Bản gốc:** `D:\era\eraweb\GIT_WORKFLOW.md`. Bản sao nằm ở `manage/`, `client/`, `tester/` (3 repo Git độc lập, root workspace **không** phải repo). Sửa bản gốc rồi chép đè 3 bản.
> **Nguồn sự thật của logic type:** `tester/src/lib/commit-types.ts`. Đổi type/hành vi ở đó → cập nhật file này.
> Bổ sung cho [`GIT_COMMIT_CONVENTIONS.md`](./GIT_COMMIT_CONVENTIONS.md) (scope, ví dụ DO/DON'T).

## TL;DR

```
feat/x ─┐
fix/y  ─┼─ PR (squash) ─▶ tester ══ push ══▶ Webhook Tester Hub ─▶ QA verify ─▶ PR (merge commit) ─▶ main ─▶ deploy
perf/z ─┘
```

1. **Mọi nhánh làm việc đều phải đi qua `tester` trước khi vào `main`.** Không PR thẳng vào `main`, không push thẳng `main`/`tester`.
2. Commit đúng `<type>(<scope>): <mô tả> [#ID]`. Type `feat|fix|perf|refactor` **tự động gửi cho Tester**; các type còn lại thì không.
3. Rebase trên `origin/tester` trước khi mở PR; push bằng `--force-with-lease`, không bao giờ `-f`.
4. Sau khi merge: xoá nhánh remote + local.

---

## 0. Phạm vi áp dụng

| Repo | Remote | Nhánh tích hợp | Nhánh production | Webhook Tester Hub |
|---|---|---|---|---|
| `manage/` | `michaelngoc/eraweb4-manage` | `tester` | `main` | Có (push vào `tester`) |
| `client/` | `michaelngoc/eraweb4-client` | `tester` | `main` | Có — Project `client4` trên Hub đã trỏ `michaelngoc/eraweb4-client`; chỉ cần cấu hình webhook GitHub của repo client |
| `tester/` | `michaelngoc/era-tester` | — | `master` | Không. Hub không tự test chính nó: PR thẳng vào `master`, vẫn theo quy chuẩn commit/PR bên dưới |

> `manage-TB/` là bản sao làm việc của repo `manage` (cùng remote) → dùng chung quy trình `manage`.

---

## 1. Chiến lược nhánh (Trunk-Based + Tester Gate)

| Nhánh | Vai trò | Ai được ghi |
|---|---|---|
| `main` | Production. Push vào `main` = CI **deploy VPS** (`deploy-prod.yml`) | Chỉ qua PR từ `tester` |
| `tester` | Nhánh kiểm thử. Push vào đây = **Webhook gọi Tester Hub** | Chỉ qua PR từ nhánh làm việc |
| `<type>/<mô-tả>` | Nhánh ngắn hạn (sống ≤ vài ngày) | Tác giả |

**Tên nhánh:** `type/ticket-hoac-short-desc` — chữ thường, kebab-case, ≤ 40 ký tự, `type` lấy từ bảng §2.

```text
feat/auth-otp          fix/db-connection        perf/p2-html-cache
fix/case-42-login-redirect   (case-42 = mã test case trên Tester Hub)
docs/git-workflow      chore/deps-next-16-3
```

Nhánh tích hợp dài hạn (`perf/integration`) được phép nhận PR task nội bộ (pr-check vẫn chạy), nhưng **khi lên `main` phải đi `release/perf-m<số>` → `tester` → `main`**. `module-*` và mọi nhánh khác: PR vào `tester`. Nhánh `release/*` mang theo document release (`docs(release)`/`chore(release)`) cùng các commit `perf|fix|feat` của mốc; khi merge vào `tester` dùng **merge commit** để Webhook thấy từng commit (GitHub chỉ gửi tối đa 20 commit/push — mốc nhiều hơn thì liệt kê `[#ID]` trong mô tả PR và kiểm tay trên Hub).

### Khởi tạo nhánh `tester` (làm 1 lần / repo)

```bash
git fetch origin
git switch -c tester origin/main      # nếu chưa có origin/tester
git push -u origin tester
```

Sau đó trên GitHub (Settings → Branches/Rulesets): bảo vệ `main` và `tester` — bắt buộc PR, bắt buộc check `PR Check` + `Tester Gate`, cấm force-push, cấm xoá.

---

## 2. Quy chuẩn Commit (Atomic + Conventional)

```text
<type>(<scope>): <mô tả ngắn, mệnh lệnh, không chấm cuối> [#ID]
```

- Header ≤ 72 ký tự. Không viết hoa chữ đầu cũng được, nhưng thống nhất trong 1 PR.
- `[#ID]` = mã test case trên Tester Hub (nhiều case: `[#12] [#15]`). Dạng `[case-12]` cũng được nhận.
- Breaking change: thêm `!` — `feat(api)!: đổi envelope response`.
- **Atomic:** 1 commit = 1 ý đồ, build/lint qua. Không trộn `fix` + `style` + `refactor`. Commit rename/move file **riêng** (thêm SHA vào `.git-blame-ignore-revs`, xem `manage/CONVENTIONS.md`).

### Type hợp lệ & hành vi với Tester Hub (khớp `commit-types.ts`)

| Type | Dùng khi | Gửi Tester? |
|---|---|---|
| `feat` | Tính năng/block/API mới | ✅ |
| `fix` | Sửa lỗi | ✅ |
| `perf` | Tối ưu hiệu năng | ✅ |
| `refactor` | Tái cấu trúc, không đổi hành vi | ✅ |
| `style` | CSS/format (không đổi logic) | ❌ |
| `docs` | Tài liệu | ❌ |
| `test` | Thêm/sửa test tự động | ❌ |
| `chore` | Deps, script, config | ❌ |
| `ci` | GitHub Actions, pipeline | ❌ |
| `revert` | Hoàn tác commit | ❌ |

Type khác (hoặc commit không theo định dạng, `wip`, `update`…) bị **bỏ qua hoàn toàn** bởi Hub.

### "Gửi Tester" thực sự làm gì (`tester/src/lib/git-impact.ts`)

Webhook **chỉ** xử lý push vào nhánh `tester`, quét **từng commit** trong push (GitHub cắt ở 20 commit), và chỉ với commit type ✅:

1. Có `[#ID]` → case chuyển sang **`VERIFY`**, giao cho người tạo case, ghi Audit Log (`AUTO_GIT_VERIFY`) kèm SHA, bật cờ `is_impacted_by_git`.
2. File thay đổi khớp `file_patterns` của Module → bật cờ Git Impact cho các case của module đó, tự gán Tester phụ trách, lưu git log.
3. Tạo/cập nhật **Đợt Test Hàng Ngày** (`DAILY_INCREMENTAL`) và **gửi email** cho Tester của module bị ảnh hưởng.
4. Push chỉ gồm `docs/test/chore/style/ci/revert` hoặc commit không chuẩn → không làm gì cả (không email, không đổi trạng thái).

Số PR **không** phải mã case: `Merge pull request #99`, `(#97)` bị bỏ qua. Chỉ `[#ID]` / `[case-ID]` có hiệu lực.

Vòng đời case: `NEW` → (Dev bấm "Nhận sửa lỗi") `FIX` → (push vào `tester`) `VERIFY` → (QA pass) `DEPLOY` → `CLOSED`. **`DEPLOY` = tín hiệu cho Dev mở PR `tester → main`.**

```bash
# 1-click: nút [Copy Lệnh] trên thẻ Kanban Tester Hub cho ra sẵn lệnh dạng này
git commit -m "fix(auth): chặn đăng nhập khi tài khoản chưa duyệt [#7]"
```

> **Squash vào `tester` ⇒ tiêu đề PR chính là commit mà Hub đọc.** Tiêu đề PR phải theo đúng định dạng và có `[#ID]`, vd `fix(auth): chặn đăng nhập khi chưa duyệt [#7]`.

---

## 3. Sync & Push

### Bắt đầu làm việc

```bash
git fetch origin
git switch -c fix/auth-token-refresh origin/tester   # luôn tách từ tester mới nhất
```

### Trước khi mở PR — rebase lên `tester`

```bash
npm run lint && npx tsc --noEmit && npm test        # client: npm run test:run
git fetch origin
git rebase origin/tester
```

Conflict:

```bash
git status                         # xem file conflict
# sửa file, bỏ marker <<<<<<< ======= >>>>>>>
git add <file>
git rebase --continue              # lặp lại cho tới hết
git rebase --abort                 # bỏ cuộc, quay lại trạng thái trước rebase
```

Gặp conflict ở file sinh tự động (`package-lock.json`): lấy bản của `tester`, chạy lại `npm install`, `git add`. Không resolve tay.

### Push

```bash
git push -u origin fix/auth-token-refresh            # lần đầu
git push --force-with-lease --force-if-includes      # sau khi rebase/amend (chỉ nhánh của bạn)
```

### ⚠️ Lệnh nguy hiểm

| Lệnh | Rủi ro | Thay thế / Phục hồi |
|---|---|---|
| `git push -f` / `--force` | Ghi đè commit người khác trên remote | Dùng `--force-with-lease --force-if-includes`. **Cấm tuyệt đối** trên `main`/`tester`. Phục hồi: `git reflog` ở máy người đã push, hoặc GitHub → Activity |
| `git reset --hard` | Mất thay đổi chưa commit, nhảy HEAD | Dùng `git stash` trước. Phục hồi commit: `git reflog` → `git reset --hard HEAD@{n}` |
| `git clean -fd` | Xoá vĩnh viễn file untracked | `git clean -nd` (dry-run) trước |
| `git checkout -- .` / `git restore .` | Mất sửa đổi chưa commit | `git stash` trước |
| `git rebase` trên nhánh đã chia sẻ | Lịch sử phân kỳ | Chỉ rebase nhánh của riêng bạn |
| `git branch -D` | Xoá nhánh chưa merge | Phục hồi: `git reflog` → `git branch <tên> <sha>` |
| `--no-verify` | Bỏ qua hook | Không dùng |

```bash
# Cứu hộ chuẩn: tìm lại trạng thái trước khi hỏng
git reflog                            # liệt kê HEAD@{0..n}
git switch -c rescue/<mô-tả> <sha>    # tạo nhánh tại commit cần cứu (an toàn hơn reset --hard)
```

---

## 4. PR & Merge

### Luồng

1. **PR 1:** `<type>/<tên>` → `tester`. Merge: **Squash** (1 commit conventional, giữ `[#ID]`).
2. Push vào `tester` → Webhook → case `VERIFY` → QA kiểm thử → `DEPLOY`.
3. **PR 2:** `tester` → `main`. Merge: **Merge commit** (không squash/rebase, để giữ SHA từng commit đã verify và `.git-blame-ignore-revs` đúng). CI deploy chạy khi push `main`.
4. `main` có thêm 1 merge commit mà `tester` chưa có — không ảnh hưởng PR sau. Nếu GitHub báo `tester` behind `main` đáng kể, tạo PR `chore/sync-main-<ngày>` (base `tester`, merge commit). Không push thẳng `tester`.

Hotfix và PR `revert` cũng đi qua `tester` (PR `fix/...` → `tester`, QA verify nhanh, rồi `tester → main`). Không có đường tắt; production hỏng thì báo người dùng để QA duyệt gấp, AI agent không được vòng qua gate.

**Agent không tự merge `tester → main`.** Chỉ mở PR đó khi người dùng xác nhận case đã `DEPLOY` (hoặc QA đã duyệt) và chờ người dùng đồng ý merge.

### Checklist review (người tạo tự tick, reviewer kiểm lại)

- [ ] Tiêu đề PR đúng `<type>(<scope>): ... [#ID]`; base = `tester`
- [ ] Đã rebase `origin/tester`, không còn conflict, không có commit "wip/fix bug/update"
- [ ] `npm run lint`, `npx tsc --noEmit`, test pass (manage: thêm `npm run audit:routes` nếu đụng API)
- [ ] Không secret/`.env`, không `console.log`, không import/biến thừa
- [ ] `manage`: đúng ranh giới `server-only`, có permission check + validation 3 lớp cho input mới
- [ ] `client`: Server Component mặc định, `"use client"` chỉ ở leaf
- [ ] Đổi block → manage và client **đồng bộ** (parity test)
- [ ] Đã cập nhật docs/`CHANGELOG` nếu đổi hành vi

### Dọn dẹp sau merge

```bash
git switch tester && git pull --ff-only origin tester
git branch -d fix/auth-token-refresh              # local (an toàn: từ chối nếu chưa merge)
git push origin --delete fix/auth-token-refresh   # remote (hoặc bật "Automatically delete head branches" trên GitHub)
git fetch --prune                                 # xoá tham chiếu remote đã mất
git branch --merged origin/tester | grep -vE "^\*|tester|main"   # liệt kê nhánh local đã merge
```

> Nhánh bị squash không được `git branch -d` nhận là "merged" → khi PR đã merge, dùng `-D` **sau khi** xác nhận trên GitHub (xem `git reflog` nếu lỡ tay).

---

## 5. Cheat-sheet 1 vòng đời

```bash
# 1. Nhận case #7 trên Tester Hub (bấm "Nhận sửa lỗi")
git fetch origin && git switch -c fix/case-7-login-block origin/tester
# 2. Code → kiểm tra → commit atomic
npm run lint && npx tsc --noEmit
git add -p
git commit -m "fix(auth): chặn đăng nhập khi tài khoản chưa duyệt [#7]"
# 3. Sync + push
git fetch origin && git rebase origin/tester
git push -u origin fix/case-7-login-block
# 4. Mở PR → base tester (squash)
gh pr create --base tester --title "fix(auth): chặn đăng nhập khi tài khoản chưa duyệt [#7]" --fill-verbose
# 5. Sau QA = DEPLOY: PR tester → main (merge commit)
gh pr create --base main --head tester --title "chore(release): tester → main <ngày>"
# 6. Dọn dẹp
git switch tester && git pull --ff-only && git branch -D fix/case-7-login-block && git fetch --prune
```

---

## 6. Quy tắc cho AI Agent / Skill (BẮT BUỘC mỗi khi làm việc)

Áp dụng cho Claude Code, Gemini/Antigravity (`.agent/`), mọi skill/agent chạm vào Git.

1. **Đọc file này trước khi chạy bất kỳ lệnh git ghi (commit/push/branch/merge/rebase/PR).**
2. Chỉ commit/push/mở PR **khi người dùng yêu cầu**. Không tự push.
3. Chỉ làm việc trên nhánh `type/mô-tả`. Đang ở `main`/`tester` → tạo nhánh trước. Không commit thẳng `main`/`tester`.
4. PR luôn có **base = `tester`** (ngoại lệ: PR task nội bộ vào nhánh tích hợp `perf/integration`). PR vào `main` chỉ từ head `tester`, và agent không tự merge PR đó khi chưa có xác nhận của người dùng/QA.
5. Commit message đúng §2, **kèm `[#ID]`** khi có case. Không có ID → hỏi người dùng, không bịa. Chọn type theo bảng; `docs/test/chore` sẽ không báo Tester — đừng dùng chúng để "né" kiểm thử cho thay đổi hành vi.
6. Atomic: tách commit theo ý đồ; rename/move file commit riêng.
7. Trước commit: lint + `tsc --noEmit` + test liên quan; xoá import thừa và `console.log`. Không `--no-verify`.
8. **Cấm** (trừ khi người dùng ra lệnh rõ ràng cho đúng lệnh đó): `push -f`, `reset --hard`, `clean -fd`, `branch -D`, `checkout -- .`, rebase/force nhánh chung, sửa lịch sử `main`/`tester`. Cần ghi đè → `--force-with-lease --force-if-includes`, chỉ nhánh của bạn.
9. Không bao giờ commit `.env*`, key, token, DB dump.
10. Trước khi xoá/ghi đè: nhìn đích (`git status`, `git log`, `git diff`). Hỏng → `git reflog`, không đoán.
11. Cuối công việc báo trung thực: đã commit gì, đã push chưa, PR nào, check nào fail.
12. Ba repo độc lập: `git -C <manage|client|tester>`; không giả định root là repo.

---

## 7. Enforcement trong repo

| Cơ chế | File | Trạng thái |
|---|---|---|
| CI check PR vào `tester` & `main` | `manage|client/.github/workflows/pr-check.yml` | `branches: [tester, main, perf/integration]` |
| Chặn PR vào `main` nếu head ≠ `tester` | `manage|client/.github/workflows/tester-gate.yml` | Cần đặt làm *required check* trong branch protection |
| Webhook phân loại type | `tester/src/lib/commit-types.ts`, `git-impact.ts` | Chạy khi push `tester` |
| Quy tắc AI | `CLAUDE.md` mỗi repo, `.agent/AGENTS.md`, skill `eraweb-git-workflow` | Đọc tự động |

Webhook GitHub (Settings → Webhooks): Payload URL `<tester-hub>/api/webhooks/github`, content type `application/json`, event **Push**. Hiện route **chưa xác thực chữ ký** `X-Hub-Signature-256` — nên bổ sung secret trước khi mở Hub ra Internet.

## 8. Gotchas

- Webhook chỉ thấy push vào nhánh tên đúng `tester`; PR merge bằng UI cũng tạo push event → vẫn kích hoạt.
- Push > 20 commit: GitHub cắt danh sách → squash merge giúp tránh mất `[#ID]`.
- Mã case sai/không tồn tại: bỏ qua im lặng. Kiểm tra lại ID trên Hub.
- `tsc --noEmit` của `tester` là kiểm tra bắt buộc khi sửa `commit-types.ts`.
- Windows: dùng Git Bash hoặc PowerShell; ví dụ `grep -vE` ở §4 chỉ chạy trên Git Bash.
