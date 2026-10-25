"""
migrate.py - Script tự động cập nhật cấu trúc cơ sở dữ liệu (Database Migration):
1. Thêm cột latency_ms vào bảng ai_logs.
2. Thêm cột is_valid_entry và validation_message vào bảng attendance.
3. Thêm cột max_sessions và remaining_sessions vào bảng memberships.
4. Tạo bảng trainer_schedules chống trùng lịch PT.
"""

import sys
import os
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.core.database import engine, Base
import app.models  # load all models


def run_migration():
    print("==================================================")
    print("🔄 Đang thực thi Migration cấu trúc CSDL...")
    print("==================================================")

    # 1. Tự động tạo bảng mới (như trainer_schedules) nếu chưa tồn tại
    Base.metadata.create_all(bind=engine)
    print("✅ Đã kiểm tra và tạo bảng mới: trainer_schedules (nếu chưa có).")

    # 2. Bổ sung các cột mới vào các bảng đang có nếu dùng SQLite / PostgreSQL
    with engine.connect() as conn:
        # SQLite column alter helper
        def add_column_if_not_exists(table_name, column_name, column_type):
            try:
                sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type};"
                conn.execute(text(sql))
                conn.commit()
                print(f"✅ Đã thêm cột '{column_name}' vào bảng '{table_name}'.")
            except Exception as e:
                # Column likely already exists
                print(f"ℹ️ Cột '{column_name}' trong bảng '{table_name}' đã tồn tại hoặc bỏ qua.")

        add_column_if_not_exists("ai_logs", "latency_ms", "INTEGER")
        add_column_if_not_exists("attendance", "is_valid_entry", "BOOLEAN DEFAULT 1")
        add_column_if_not_exists("attendance", "validation_message", "VARCHAR(255)")
        add_column_if_not_exists("memberships", "max_sessions", "INTEGER")
        add_column_if_not_exists("memberships", "remaining_sessions", "INTEGER")
        add_column_if_not_exists("memberships", "goal_notes", "VARCHAR(255)")
        add_column_if_not_exists("memberships", "target_weight_kg", "FLOAT")

    print("==================================================")
    print("🎉 MIGRATION HOÀN TẤT THÀNH CÔNG!")
    print("==================================================")


if __name__ == "__main__":
    run_migration()
