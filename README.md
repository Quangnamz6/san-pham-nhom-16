# HỆ THỐNG QUẢN LÝ TRUNG TÂM THỂ HÌNH TÍCH HỢP AI (GYM AI MANAGEMENT)

Hệ thống quản lý phòng gym hiện đại toàn diện, tích hợp trí tuệ nhân tạo (OpenAI / Gemini) giúp tối ưu hóa nghiệp vụ quản lý hội viên, huấn luyện viên, hợp đồng gói tập, điểm danh check-in và tự động lập giáo án tập luyện, thực đơn dinh dưỡng chuẩn thể hình học.

---

## 1. Công nghệ Sử dụng (Tech Stack)

- **Backend**:
  - **FastAPI**: REST API Framework hiệu năng cao, hỗ trợ Async I/O và tự sinh Swagger UI OpenAPI docs.
  - **SQLAlchemy 2.0**: ORM quản lý thực thể cơ sở dữ liệu mạnh mẽ.
  - **Pydantic v2**: Xác thực và ràng buộc dữ liệu đa tầng (Data Validation & Serialization).
  - **Alembic**: Quản lý phiên bản và migration lược đồ Database.
  - **Passlib (Bcrypt) & Python-Jose**: Băm mật khẩu và cấp phát JWT token bảo mật.
  - **SlowAPI**: Giới hạn tần suất gọi API (Rate Limiting).
- **Frontend**:
  - **React 18 (Vite)**: Tốc độ build và Hot Module Replacement (HMR) cực nhanh.
  - **Tailwind CSS**: Thiết kế giao diện Glassmorphism Dark Mode thể thao, sang trọng.
  - **Axios**: Quản lý HTTP requests với Interceptors tự động đính kèm Bearer token.
  - **React Router v6**: Định tuyến ứng dụng với Role-based Protected Routes.
  - **Lucide React**: Bộ icon hiện đại.
- **Database**:
  - **PostgreSQL** (Khuyến nghị môi trường Production).
  - **SQLite** (Mặc định cấu hình sẵn cho môi trường Local Dev chạy tức thì mà không cần cài đặt DBMS).
- **AI Engine**:
  - OpenAI API (`gpt-4o-mini`, `gpt-4o`) hoặc Google Gemini API (`gemini-2.0-flash`).
  - Tích hợp Fallback Engine tự động khi chưa điền API Key.

---

## 2. Cấu trúc Thư mục Dự án Chuẩn Modular

```text
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── auth.py         # Đăng nhập, đăng ký, JWT profile
│   │   │       │   ├── users.py        # Quản lý người dùng & phân quyền Admin
│   │   │       │   ├── packages.py     # Danh mục gói tập gym
│   │   │       │   ├── memberships.py  # Hợp đồng gói tập của hội viên
│   │   │       │   ├── trainers.py     # Hồ sơ huấn luyện viên PT
│   │   │       │   ├── schedules.py    # Lịch tập luyện PT & Hội viên
│   │   │       │   ├── attendance.py   # Quản lý điểm danh Check-in
│   │   │       │   ├── payments.py     # Hóa đơn thanh toán & kích hoạt gói
│   │   │       │   └── ai.py           # Endpoint Cố vấn AI (Workout & Diet)
│   │   │       └── api.py              # APIRouter tổng hợp
│   │   ├── core/
│   │   │   ├── config.py               # Pydantic BaseSettings
│   │   │   ├── database.py             # SQLAlchemy Engine, SessionLocal, Base
│   │   │   ├── security.py             # Bcrypt hashing & JWT encoding/decoding
│   │   │   └── deps.py                 # Dependencies xác thực JWT & RBAC
│   │   ├── models/                     # 8 SQLAlchemy Data Models
│   │   │   ├── user.py
│   │   │   ├── package.py
│   │   │   ├── membership.py
│   │   │   ├── trainer.py
│   │   │   ├── workout_schedule.py
│   │   │   ├── attendance.py
│   │   │   ├── payment.py
│   │   │   └── ai_log.py
│   │   ├── schemas/                    # Pydantic Validation Schemas
│   │   ├── services/
│   │   │   └── ai_service.py           # Xử lý Prompt, gọi LLM & lưu AILogs
│   │   ├── tests/
│   │   │   ├── conftest.py
│   │   │   └── test_health.py
│   │   └── main.py                     # Khởi tạo FastAPI app, CORS, Middleware
│   ├── .env.example
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/common/          # Navbar, Sidebar, ProtectedRoute
│   │   ├── context/                    # AuthContext (JWT state)
│   │   ├── pages/                      # HomePage, LoginPage, DashboardPage, AIAdvisorPage
│   │   ├── routes/                     # AppRoutes
│   │   ├── services/                   # api.js, authService.js, aiService.js
│   │   ├── App.jsx
│   │   ├── index.css                   # Tailwind + Glassmorphism
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
│
└── docs/
    ├── architecture.md                 # Kiến trúc hệ thống, Use Case sơ đồ 4 actors
    ├── database_erd.md                 # Sơ đồ quan hệ thực thể ERD & Từ điển dữ liệu
    └── ai_prompts.md                   # Đặc tả Prompt AI & Structured JSON Schemas
```

---

## 3. Hướng dẫn Cài đặt & Chạy Dự án

### 3.1. Khởi động Backend (FastAPI)

1. **Di chuyển vào thư mục backend**:
   ```bash
   cd backend
   ```

2. **Tạo và kích hoạt môi trường ảo Python**:
   - Trên Windows:
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - Trên Linux / macOS:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Cài đặt các thư viện phụ thuộc**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Tạo file cấu hình `.env`**:
   Sao chép từ `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *Mặc định hệ thống sử dụng `DATABASE_URL=sqlite:///./gym_dev.db` giúp bạn chạy thử nghiệm ngay lập tức. Để kết nối PostgreSQL, chỉ cần đổi chuỗi kết nối sang dạng `postgresql+psycopg2://user:password@localhost:5432/gym_db`.*

5. **Khởi tạo Dữ liệu mẫu & Migration CSDL**:
   - Chạy script cập nhật bảng mới và các trường kiểm soát (`latency_ms`, `is_valid_entry`, `trainer_schedules`):
     ```bash
     python migrate.py
     ```
   - Chạy lệnh nạp sẵn 1 Admin, 1 Lễ tân, 2 PT, 5 Member, 3 Gói tập, Lịch tập và Lịch sử điểm danh:
     ```bash
     python seed_data.py
     ```
   *Tài khoản dùng thử có sẵn:*
   - **Admin**: `admin@gym.com` | Mật khẩu: `admin123`
   - **Lễ tân**: `letan@gym.com` | Mật khẩu: `letan123`
   - **Huấn luyện viên (PT)**: `pt1@gym.com` hoặc `pt2@gym.com` | Mật khẩu: `pt123`
   - **Hội viên (Member)**: `member1@gym.com` đến `member5@gym.com` | Mật khẩu: `member123`

6. **Khởi chạy máy chủ Backend**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   - Ứng dụng Backend sẽ chạy tại: `http://localhost:8000`
   - Tài liệu OpenAPI tương tác (Swagger UI): `http://localhost:8000/docs`
   - Tài liệu ReDoc: `http://localhost:8000/redoc`
   - Endpoint kiểm tra sức khỏe hệ thống: `http://localhost:8000/health`
   - Endpoint thống kê tổng quan: `http://localhost:8000/api/v1/dashboard/stats`

---

### 3.2. Khởi động Frontend (React + Vite)

1. **Mở terminal mới và di chuyển vào thư mục frontend**:
   ```bash
   cd frontend
   ```

2. **Cài đặt các gói thư viện Node.js**:
   ```bash
   npm install
   ```

3. **Tạo file `.env` cho Frontend**:
   ```bash
   cp .env.example .env
   ```
   Nội dung file `.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```

4. **Khởi chạy máy chủ phát triển Vite**:
   ```bash
   npm run dev
   ```
   - Truy cập giao diện người dùng tại: `http://localhost:5173`

---

## 4. Kiểm thử Backend Tự động (Pytest Suites)

Dự án trang bị bộ test tự động chuyên sâu kiểm tra toàn diện API và AI Module:
```bash
cd backend
# Chạy toàn bộ test suites
pytest

# 1. Kiểm thử kịch bản AI gặp lỗi Timeout và tự kích hoạt Fallback:
pytest app/tests/test_ai_timeout.py -v

# 2. Kiểm thử kịch bản dữ liệu thiếu / không hợp lệ & kích hoạt Safety Guardrail:
pytest app/tests/test_ai_validation.py -v
```

---

## 5. Tài liệu Thiết kế Chi tiết
- [docs/architecture.md](docs/architecture.md): Sơ đồ Use Case cho 4 vai trò (Admin, Receptionist, PT, Member), luồng dữ liệu kiến trúc Client-Server và yêu cầu bảo mật phi chức năng.
- [docs/database_erd.md](docs/database_erd.md): Sơ đồ quan hệ thực thể Mermaid ERD và từ điển dữ liệu cho 8 bảng (`users`, `packages`, `memberships`, `trainers`, `workout_schedules`, `attendance`, `payments`, `ai_logs`).
- [docs/ai_prompts.md](docs/ai_prompts.md): Đặc tả cấu trúc Prompt, JSON Schema phản hồi và cơ chế chống ảo giác y khoa cho tính năng Cố vấn Thể hình AI.
