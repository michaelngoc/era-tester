-- Tester Hub: index cho các cột lọc/JOIN nóng (dashboard, danh sách case, phân quyền thành viên).
-- Idempotent: IF NOT EXISTS; CONCURRENTLY để không khoá ghi. Chạy từng lệnh ngoài transaction (psql -f là được).
-- Schema era_tester nằm trong eraweb_master, KHÔNG phải tenant schema (không qua era_tenant_schema).
-- Đã có sẵn (không tạo lại): idx_tester_history_case (case_history.case_id), idx_tester_runs_proj (runs.project_id),
-- era_tester_project_members_project_id_user_id_key (project_id, user_id).
SET search_path = era_tester;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tester_cases_module_id ON era_tester_cases (module_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tester_cases_flow_id ON era_tester_cases (flow_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tester_cases_last_run_id ON era_tester_cases (last_run_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tester_modules_project_id ON era_tester_modules (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tester_flows_module_id ON era_tester_flows (module_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tester_project_members_user_id ON era_tester_project_members (user_id);
