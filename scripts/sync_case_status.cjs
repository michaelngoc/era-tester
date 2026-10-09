const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const pool = new Pool({
  host: env.PGHOST,
  port: Number(env.PGPORT) || 5432,
  database: env.PGDATABASE || 'eraweb_master',
  user: env.ERA_TESTER_USER,
  password: env.ERA_TESTER_PASSWORD,
  ssl: env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  options: `-c search_path="${env.PG_SCHEMA || 'era_tester'}"`,
});

async function run() {
  try {
    // 1. Những case nào có actual_result VÀ actual_result == expected_result -> Chuyển thành CLOSED (Đã Đạt)
    const updateRes = await pool.query(`
      UPDATE era_tester_cases
      SET status = 'CLOSED', updated_at = NOW()
      WHERE actual_result IS NOT NULL 
        AND TRIM(actual_result) = TRIM(expected_result)
        AND status = 'NEW'
      RETURNING id, title
    `);
    console.log(`Đã cập nhật ${updateRes.rows.length} kịch bản sang trạng thái CLOSED (Đã Đạt):`);
    updateRes.rows.forEach(r => console.log(` - [#${r.id}] ${r.title}`));

    // 2. Kiểm tra case #81
    const case81 = await pool.query('SELECT id, title, status FROM era_tester_cases WHERE id = 81');
    console.log("Case 81 hiện tại:", case81.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
