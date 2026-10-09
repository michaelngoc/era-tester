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
    const cases = await pool.query(`
      SELECT c.id, c.node_id, c.title, c.priority, c.input_data, c.output_data, c.expected_result, c.actual_result, c.status
      FROM era_tester_cases c
      WHERE c.flow_id = 1
      ORDER BY c.id
    `);
    console.log(`TỔNG SỐ KỊCH BẢN KIỂM THỬ FLOW LOGIN: ${cases.rows.length}`);
    cases.rows.forEach(r => {
      console.log(`[#${r.id}] [${r.node_id}] ${r.title} | Status: ${r.status}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
