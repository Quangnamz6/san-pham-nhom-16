# THIẾT KẾ CƠ SỞ DỮ LIỆU & SƠ ĐỒ ERD (ENTITY RELATIONSHIP DIAGRAM)
**Gym Management System Database Schema & Data Dictionary**

---

## 1. Sơ đồ Quan hệ Thực thể (Mermaid ERD)

```mermaid
erDiagram
    USERS ||--o| TRAINERS : "is profile of (1:0..1)"
    USERS ||--o{ MEMBERSHIPS : "subscribes (1:N)"
    USERS ||--o{ WORKOUT_SCHEDULES : "member attends (1:N)"
    USERS ||--o{ TRAINER_SCHEDULES : "member books (1:N)"
    USERS ||--o{ ATTENDANCES : "member check-in (1:N)"
    USERS ||--o{ AI_LOGS : "invokes (1:N)"
    TRAINERS ||--o{ WORKOUT_SCHEDULES : "assigned to (1:N)"
    TRAINERS ||--o{ TRAINER_SCHEDULES : "time slots (1:N)"

    PACKAGES ||--o{ MEMBERSHIPS : "applied to (1:N)"
    MEMBERSHIPS ||--o{ PAYMENTS : "billed for (1:N)"
    WORKOUT_SCHEDULES ||--o{ ATTENDANCES : "session log (1:N)"

    USERS {
        int id PK
        string full_name
        string email UK
        string password_hash
        enum role "admin, receptionist, pt, member"
        string phone
        datetime created_at
    }

    PACKAGES {
        int id PK
        string name
        int duration_days
        decimal price
        text description
        datetime created_at
    }

    MEMBERSHIPS {
        int id PK
        int user_id FK
        int package_id FK
        date start_date
        date end_date
        enum status "active, expired, pending, cancelled"
        int max_sessions "nullable"
        int remaining_sessions "nullable"
        datetime created_at
    }

    TRAINERS {
        int id PK
        int user_id FK,UK
        text bio
        string specialization
        datetime created_at
    }

    TRAINER_SCHEDULES {
        int id PK
        int pt_id FK
        int member_id FK,nullable
        datetime start_time UK
        datetime end_time
        enum status "available, booked, completed, cancelled"
        text notes
        datetime created_at
    }

    WORKOUT_SCHEDULES {
        int id PK
        int member_id FK
        int pt_id FK
        datetime start_time
        datetime end_time
        enum status "scheduled, completed, cancelled, no_show"
        text notes
        datetime created_at
    }

    ATTENDANCES {
        int id PK
        int member_id FK
        int schedule_id FK,nullable
        datetime check_in_time
        enum status "present, late, absent"
        boolean is_valid_entry
        string validation_message
        datetime created_at
    }

    PAYMENTS {
        int id PK
        int membership_id FK
        decimal amount
        datetime payment_date
        enum payment_method "cash, credit_card, bank_transfer, momo_vnpay"
        enum status "completed, pending, failed, refunded"
        string transaction_code UK,nullable
    }

    AI_LOGS {
        int id PK
        int user_id FK,nullable
        enum prompt_type "recommend_workout, generate_reminder, summarize_progress..."
        json input_data
        json ai_response
        string model_name
        int tokens_used
        int latency_ms
        datetime created_at
    }
```

---

## 2. Từ điển Dữ liệu Chi tiết (Data Dictionary)

### 2.1. Bảng `users` (Quản lý tài khoản & phân quyền)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTO_INCREMENT` | Định danh người dùng |
| `full_name` | `VARCHAR(150)` | `NOT NULL` | Họ và tên |
| `email` | `VARCHAR(255)` | `NOT NULL, UNIQUE, INDEX` | Địa chỉ email đăng nhập |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Chuỗi băm mật khẩu Bcrypt |
| `role` | `VARCHAR(30)` | `NOT NULL, DEFAULT 'member'` | Vai trò: `admin`, `receptionist`, `pt`, `member` |
| `phone` | `VARCHAR(20)` | `NULLABLE` | Số điện thoại liên hệ |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL, DEFAULT NOW()` | Thời điểm tạo tài khoản |

### 2.2. Bảng `packages` (Danh mục gói tập gym)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTO_INCREMENT` | Mã định danh gói tập |
| `name` | `VARCHAR(150)` | `NOT NULL` | Tên gói (VD: Gold 6 Tháng, VIP 1 Năm) |
| `duration_days` | `INTEGER` | `NOT NULL, CHECK (duration_days > 0)` | Thời hạn của gói tính theo ngày |
| `price` | `NUMERIC(12, 2)` | `NOT NULL, CHECK (price >= 0)` | Giá bán gói tập (VND) |
| `description` | `TEXT` | `NULLABLE` | Chi tiết quyền lợi và mô tả gói |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL, DEFAULT NOW()` | Ngày tạo gói |

### 2.3. Bảng `memberships` (Hợp đồng / gói tập của hội viên)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTO_INCREMENT` | Mã hợp đồng hội viên |
| `user_id` | `INTEGER` | `NOT NULL, FK -> users(id) ON DELETE CASCADE` | Mã hội viên |
| `package_id` | `INTEGER` | `NOT NULL, FK -> packages(id) ON DELETE RESTRICT`| Mã gói tập đã mua |
| `start_date` | `DATE` | `NOT NULL` | Ngày bắt đầu có hiệu lực |
| `end_date` | `DATE` | `NOT NULL, CHECK (end_date >= start_date)` | Ngày hết hạn gói tập |
| `status` | `VARCHAR(30)` | `NOT NULL, DEFAULT 'pending'` | `active`, `expired`, `pending`, `cancelled` |
| `max_sessions`| `INTEGER` | `NULLABLE` | Tổng số buổi được tập (với gói theo lượt) |
| `remaining_sessions`| `INTEGER` | `NULLABLE` | Số buổi tập còn lại |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL, DEFAULT NOW()` | Ngày đăng ký |

### 2.4. Bảng `trainer_schedules` (Quản lý khung giờ & Chống trùng lịch PT ở cấp CSDL)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTO_INCREMENT` | Mã bản ghi lịch |
| `pt_id` | `INTEGER` | `NOT NULL, FK -> trainers(id) ON DELETE CASCADE` | Huấn luyện viên phụ trách |
| `member_id` | `INTEGER` | `NULLABLE, FK -> users(id) ON DELETE SET NULL` | Học viên đặt lịch (nếu đã book) |
| `start_time` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL, UNIQUE(pt_id, start_time)` | Giờ bắt đầu (Chống trùng giờ tuyệt đối) |
| `end_time` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL, CHECK (end_time > start_time)` | Giờ kết thúc |
| `status` | `VARCHAR(30)` | `NOT NULL, DEFAULT 'booked'` | `available`, `booked`, `completed`, `cancelled` |
| `notes` | `TEXT` | `NULLABLE` | Ghi chú chuyên môn |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL, DEFAULT NOW()` | Ngày tạo lịch |

### 2.5. Bảng `attendance` (Lịch sử điểm danh & Kiểm soát lượt tập)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTO_INCREMENT` | Mã lần điểm danh |
| `member_id` | `INTEGER` | `NOT NULL, FK -> users(id) ON DELETE CASCADE` | Hội viên điểm danh |
| `schedule_id` | `INTEGER` | `NULLABLE, FK -> workout_schedules(id) ON DELETE SET NULL` | Liên kết buổi tập PT nếu có |
| `check_in_time` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL, DEFAULT NOW()` | Thời điểm quét thẻ / check-in |
| `status` | `VARCHAR(30)` | `NOT NULL, DEFAULT 'present'` | `present`, `late`, `absent` |
| `is_valid_entry`| `BOOLEAN` | `NOT NULL, DEFAULT TRUE` | Trạng thái hợp lệ hay cảnh báo lượt vào |
| `validation_message`| `VARCHAR(255)` | `NULLABLE` | Thông điệp kiểm tra (VD: 'Thẻ hợp lệ', 'Thẻ hết hạn') |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL, DEFAULT NOW()` | Thời điểm ghi nhận |

### 2.6. Bảng `ai_logs` (Nhật ký truy vấn, Hiệu năng Latency & Token AI)
| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTO_INCREMENT` | Mã bản ghi log AI |
| `user_id` | `INTEGER` | `NULLABLE, FK -> users(id) ON DELETE SET NULL` | Người dùng kích hoạt yêu cầu AI |
| `prompt_type` | `VARCHAR(50)` | `NOT NULL` | `recommend_workout`, `generate_reminder`, `summarize_progress`... |
| `input_data` | `JSON / JSONB` | `NOT NULL` | Toàn bộ payload đầu vào |
| `ai_response` | `JSON / JSONB` | `NOT NULL` | Kết quả JSON sinh ra từ mô hình AI |
| `model_name` | `VARCHAR(100)` | `NOT NULL, DEFAULT 'gpt-4o-mini'` | Tên model xử lý |
| `tokens_used` | `INTEGER` | `NULLABLE` | Số lượng tokens tiêu thụ |
| `latency_ms` | `INTEGER` | `NULLABLE` | Thời gian phản hồi tính theo milliseconds |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `NOT NULL, DEFAULT NOW()` | Thời điểm sinh kết quả |
