-- ====================================================================
-- DATABASE MIGRATION SCRIPT (PostgreSQL & SQLite Compatible)
-- Quản lý Trung tâm Thể hình tích hợp AI
-- ====================================================================

-- 1. Thêm cột latency_ms vào bảng ai_logs để theo dõi hiệu năng phản hồi AI
ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS latency_ms INTEGER;

-- 2. Thêm cột kiểm soát lượt tập vào bảng attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_valid_entry BOOLEAN DEFAULT TRUE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS validation_message VARCHAR(255);

-- 3. Thêm cột quản lý số lượt tập vào bảng memberships
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS max_sessions INTEGER;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS remaining_sessions INTEGER;

-- 4. Tạo bảng trainer_schedules chống trùng lịch PT ở cấp CSDL
CREATE TABLE IF NOT EXISTS trainer_schedules (
    id SERIAL PRIMARY KEY,
    pt_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'booked',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pt_schedule_time_order CHECK (end_time > start_time),
    CONSTRAINT uq_pt_exact_start_time UNIQUE (pt_id, start_time)
);

CREATE INDEX IF NOT EXISTS idx_trainer_schedules_pt_id ON trainer_schedules(pt_id);
CREATE INDEX IF NOT EXISTS idx_trainer_schedules_start_time ON trainer_schedules(start_time);
