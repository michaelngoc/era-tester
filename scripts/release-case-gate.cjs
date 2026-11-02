#!/usr/bin/env node
// Cổng chặn case Tester Hub trước khi gộp `tester → main` (manage / client).
//
// Chạy từ bất kỳ đâu, trỏ tới worktree của repo cần phát hành:
//   node D:/era/eraweb/tester/scripts/release-case-gate.cjs --repo-dir D:/era/eraweb/manage-rel \
//        [--range origin/main..origin/tester] [--waive M307:"lý do"] [--waive 1234:"lý do"] [--strict] [--json]
//
// Phạm vi đợt = case có [#ID] + module có [#M<id>] trong commit feat/fix/perf/refactor của range,
// cộng cả MODULE của các case được nhắc (commit thường chỉ ghi vài [#ID] tiêu biểu của một ma trận lớn).
// CHẶN (exit 1) khi trong phạm vi còn case NEW / FIX / VERIFY (chưa xoá mềm): case chưa chạy, đang lỗi
// hoặc chưa kiểm trên tester. DEPLOY (đạt trên tester) và CLOSED thì được.
// CẢNH BÁO: module có `file_patterns` khớp file đổi trong range nhưng không được nhắc, còn case mở.
//   --strict biến cảnh báo này thành chặn.
// --waive <id|M<id>>:"lý do" bỏ một case / module khỏi danh sách chặn (in ra cùng lý do, nên ghi vào mô tả PR).
// Chỉ ĐỌC Tester Hub. DB đọc từ tester/.env.local (cùng repo với script này).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const micromatch = require("micromatch");
const { Pool } = require("pg");

const NOTIFY_RE = /^(feat|fix|perf|refactor)(\([^)\r\n]+\))?!?:\s*\S/i; // khớp TESTER_NOTIFY_TYPES (src/lib/commit-types.ts)
const CASE_RE = /\[(?:#|case-)(\d+)\]/gi; // khớp extractCaseIds
const MODULE_RE = /\[(?:#M|module-)(\d+)\]/gi; // khớp extractModuleIds
const OPEN = ["NEW", "FIX", "VERIFY"];

function parseArgs(argv) {
  const a = { range: "origin/main..origin/tester", waive: [], strict: false, json: false, repoDir: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--repo-dir") a.repoDir = argv[++i];
    else if (k === "--range") a.range = argv[++i];
    else if (k === "--waive") a.waive.push(argv[++i]);
    else if (k === "--strict") a.strict = true;
    else if (k === "--json") a.json = true;
    else if (k === "-h" || k === "--help") a.help = true;
    else throw new Error(`tham số lạ: ${k}`);
  }
  return a;
}

function loadEnv() {
  const env = {};
  const file = process.env.TESTER_ENV_FILE || path.join(__dirname, "..", ".env.local");
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!m) continue;
    let v = m[2] || "";
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

function git(repoDir, args) {
  return execFileSync("git", ["-C", repoDir, ...args], { encoding: "utf8", maxBuffer: 1 << 28 });
}

function idsOf(re, text) {
  const out = new Set();
  for (const m of text.matchAll(re)) out.add(Number(m[1]));
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.repoDir) {
    console.log(fs.readFileSync(__filename, "utf8").split("\n").slice(1, 17).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
    process.exit(args.help ? 0 : 2);
  }
  const waived = new Map(); // "1234" | "M307" -> lý do
  for (const w of args.waive) {
    const m = /^(M?\d+):(.+)$/i.exec(w);
    if (!m || !m[2].trim()) throw new Error(`--waive cần dạng <id|M<id>>:"lý do", nhận: ${w}`);
    waived.set(m[1].toUpperCase(), m[2].trim());
  }

  // 1. Repo -> project Tester Hub
  const remote = git(args.repoDir, ["remote", "get-url", "origin"]).trim();
  const repoFull = (remote.match(/github\.com[:/](.+?)(?:\.git)?$/) || [])[1];
  if (!repoFull) throw new Error(`không đọc được tên repo GitHub từ remote: ${remote}`);

  // 2. Commit trong range
  const raw = git(args.repoDir, ["log", "--format=%H%x1f%B%x1e", args.range]);
  const commits = raw.split("\x1e").map((x) => x.trim()).filter(Boolean).map((x) => {
    const [hash, body] = x.split("\x1f");
    return { hash, body: body || "" };
  });
  const relevant = commits.filter((c) => NOTIFY_RE.test(c.body.split(/\r?\n/, 1)[0].trim()));
  const caseIds = new Set();
  const explicitModules = new Set();
  for (const c of relevant) {
    for (const id of idsOf(CASE_RE, c.body)) caseIds.add(id);
    for (const id of idsOf(MODULE_RE, c.body)) explicitModules.add(id);
  }
  const changedFiles = git(args.repoDir, ["diff", "--name-only", args.range.replace("..", "...")])
    .split(/\r?\n/).filter(Boolean);

  const env = loadEnv();
  const pool = new Pool({
    host: env.PGHOST, port: Number(env.PGPORT) || 5432, database: env.PGDATABASE || "eraweb_master",
    user: env.ERA_TESTER_USER, password: env.ERA_TESTER_PASSWORD,
    ssl: env.PG_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    options: `-c search_path="${env.PG_SCHEMA || "era_tester"}" -c default_transaction_read_only=on`,
    max: 1,
  });
  try {
    const proj = (await pool.query(
      `SELECT id, name FROM era_tester_projects WHERE LOWER(github_repo) = LOWER($1) LIMIT 1`, [repoFull]
    )).rows[0];
    if (!proj) throw new Error(`Tester Hub không có project cho repo ${repoFull}`);

    // 3. Case được nhắc
    const refRows = caseIds.size
      ? (await pool.query(
          `SELECT c.id, c.status, c.module_id, m.project_id, COALESCE(c.is_deleted,false) AS deleted
             FROM era_tester_cases c LEFT JOIN era_tester_modules m ON m.id = c.module_id
            WHERE c.id = ANY($1::int[])`, [[...caseIds]])).rows
      : [];
    const unknown = [...caseIds].filter((id) => !refRows.some((r) => r.id === id));
    const otherProject = refRows.filter((r) => r.project_id !== proj.id).map((r) => r.id);
    const moduleIds = new Set(explicitModules);
    for (const r of refRows) if (r.project_id === proj.id && r.module_id != null) moduleIds.add(r.module_id);

    // 4. Case còn mở trong phạm vi: case được nhắc + mọi case của module trong phạm vi
    const open = (await pool.query(
      `SELECT c.id, c.status, c.title, c.module_id, m.name AS module_name
         FROM era_tester_cases c JOIN era_tester_modules m ON m.id = c.module_id
        WHERE m.project_id = $1 AND COALESCE(c.is_deleted,false) = false AND c.status = ANY($2::text[])
          AND (c.id = ANY($3::int[]) OR c.module_id = ANY($4::int[]))
        ORDER BY c.module_id, c.id`,
      [proj.id, OPEN, [...caseIds], [...moduleIds]]
    )).rows;
    const blocking = open.filter((c) => !waived.has(String(c.id)) && !waived.has(`M${c.module_id}`));
    const waivedRows = open.filter((c) => !blocking.includes(c));

    // 5. Module bị chạm theo file_patterns nhưng không được nhắc
    const mods = (await pool.query(
      `SELECT m.id, m.name, m.file_patterns,
              COUNT(c.id) FILTER (WHERE c.status = ANY($2::text[]) AND COALESCE(c.is_deleted,false) = false) AS open
         FROM era_tester_modules m LEFT JOIN era_tester_cases c ON c.module_id = m.id
        WHERE m.project_id = $1 AND COALESCE(m.is_deleted,false) = false
        GROUP BY m.id`, [proj.id, OPEN]
    )).rows;
    const touched = mods
      .filter((m) => !moduleIds.has(m.id) && (m.file_patterns || []).length && Number(m.open) > 0)
      .map((m) => ({ id: m.id, name: m.name, open: Number(m.open), files: micromatch(changedFiles, m.file_patterns) }))
      .filter((m) => m.files.length > 0 && !waived.has(`M${m.id}`));

    const blocked = blocking.length > 0 || (args.strict && touched.length > 0);
    const report = {
      repo: repoFull, project: proj.id, range: args.range, commits: commits.length, relevantCommits: relevant.length,
      referencedCases: [...caseIds], modules: [...moduleIds], unknownCases: unknown, otherProjectCases: otherProject,
      blocking: blocking.map(({ id, status, module_id, title }) => ({ id, status, module_id, title })),
      waived: waivedRows.map(({ id, module_id }) => ({ id, module_id, reason: waived.get(String(id)) || waived.get(`M${module_id}`) })),
      touchedModules: touched.map(({ id, name, open, files }) => ({ id, name, open, files: files.slice(0, 5) })),
      result: blocked ? "CHẶN" : "ĐẠT",
    };
    if (args.json) { console.log(JSON.stringify(report, null, 2)); }
    else {
      console.log(`Cổng case Tester Hub: ${repoFull} (project ${proj.id}), ${args.range}`);
      console.log(`- ${commits.length} commit, ${relevant.length} commit feat/fix/perf/refactor; ${caseIds.size} [#ID], ${moduleIds.size} module trong phạm vi`);
      if (unknown.length) console.log(`- CẢNH BÁO: [#ID] không có trong Hub: ${unknown.join(", ")}`);
      if (otherProject.length) console.log(`- CẢNH BÁO: [#ID] thuộc project khác: ${otherProject.join(", ")}`);
      const byModule = new Map();
      for (const c of blocking) {
        const k = `${c.module_id} ${c.module_name}`;
        if (!byModule.has(k)) byModule.set(k, { NEW: [], FIX: [], VERIFY: [] });
        byModule.get(k)[c.status].push(c.id);
      }
      if (byModule.size) {
        console.log(`- CHẶN: ${blocking.length} case chưa đạt trong ${byModule.size} module:`);
        for (const [k, v] of byModule) {
          const parts = OPEN.filter((s) => v[s].length).map((s) => `${s} ${v[s].length} (${v[s].slice(0, 8).join(",")}${v[s].length > 8 ? ",…" : ""})`);
          console.log(`    module ${k}: ${parts.join("; ")}`);
        }
        console.log("  Cách gỡ: chạy các case trên mã tester rồi chuyển DEPLOY (đạt) hoặc FIX (lỗi, sửa tiếp);");
        console.log("  case không còn đúng với mã thì xoá mềm kèm lý do; ngoại lệ có chủ đích thì --waive <id|M<id>>:\"lý do\".");
      }
      if (waivedRows.length) console.log(`- Bỏ qua theo --waive: ${waivedRows.length} case`);
      if (touched.length) {
        console.log(`- ${args.strict ? "CHẶN" : "CẢNH BÁO"}: ${touched.length} module bị chạm (file_patterns) mà không được nhắc, còn case mở:`);
        for (const m of touched.slice(0, 30)) console.log(`    module ${m.id} ${m.name}: ${m.open} case mở; file ${m.files.slice(0, 3).join(", ")}`);
      }
      console.log(`KẾT QUẢ: ${report.result}`);
    }
    process.exitCode = blocked ? 1 : 0;
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(`LỖI: ${e.message}`); process.exit(2); });
