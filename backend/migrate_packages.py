import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8")

conn = sqlite3.connect("gym_dev.db")
c = conn.cursor()

# 1. Add columns if not exist
c.execute("PRAGMA table_info(packages)")
cols = [r[1] for r in c.fetchall()]
print("Existing package columns:", cols)

if "category" not in cols:
    c.execute("ALTER TABLE packages ADD COLUMN category VARCHAR(50) DEFAULT 'all' NOT NULL")
    print("Added column: category")

if "badge" not in cols:
    c.execute("ALTER TABLE packages ADD COLUMN badge VARCHAR(50)")
    print("Added column: badge")

if "benefits" not in cols:
    c.execute("ALTER TABLE packages ADD COLUMN benefits TEXT")
    print("Added column: benefits")

if "commitments" not in cols:
    c.execute("ALTER TABLE packages ADD COLUMN commitments TEXT")
    print("Added column: commitments")

if "featured" not in cols:
    c.execute("ALTER TABLE packages ADD COLUMN featured BOOLEAN DEFAULT 0 NOT NULL")
    print("Added column: featured")

conn.commit()

# 2. Update existing 3 packages
c.execute("""
UPDATE packages SET
    category = 'all',
    badge = 'Cơ Bản',
    benefits = 'Tập luyện không giới hạn khung giờ; Miễn phí tủ đồ thông minh; Miễn phí phòng tắm nóng lạnh',
    commitments = 'Đảm bảo môi trường tập luyện sạch sẽ, thoáng mát chuẩn 5 sao',
    featured = 0
WHERE id = 1
""")

c.execute("""
UPDATE packages SET
    category = 'all',
    badge = 'Phổ Biến',
    benefits = 'Quyền lợi gói Bronze; Tặng 2 buổi hướng dẫn cùng HLV cá nhân (PT); Đo InBody định kỳ hàng tháng; Hỗ trợ thiết kế lịch tập cơ bản',
    commitments = 'Cam kết tăng thể lực và cải thiện vóc dáng sau 90 ngày',
    featured = 1
WHERE id = 2
""")

c.execute("""
UPDATE packages SET
    category = 'all',
    badge = 'VIP Cao Cấp',
    benefits = 'Tặng 5 buổi tập PT 1:1 chuyên sâu; Miễn phí phòng xông hơi khô/ướt Sauna; Miễn phí nước uống điện giải mỗi buổi; Tủ đồ riêng VIP',
    commitments = 'Cam kết đạt mục tiêu hình thể cá nhân hóa 100%',
    featured = 1
WHERE id = 3
""")

# 3. Insert rich packages for specific categories if not exist
rich_packages = [
    # Cho Nữ
    (
        "Gói Săn Chắc Vóc Dáng (Fit Girl & Booty)",
        30,
        750000,
        "Giáo án thiết kế chuyên sâu cho phái nữ: Tập trung săn chắc vòng 3, siết eo thon gọn và giảm mỡ bắp tay, đùi.",
        "female",
        "Dành Cho Nữ",
        "Giáo án chuyên biệt cơ mông - eo - đùi; Lớp Yoga & Zumba miễn phí; Đo chỉ số mỡ dưới da InBody 2 tuần/lần; Tủ đồ riêng và máy sấy tóc Dyson",
        "Cam kết giảm 3-5cm vòng eo và nâng cơ mông tự nhiên sau 1 tháng",
        1,
    ),
    (
        "Gói Nữ Hoàng Hình Thể (Curves & Tone VIP)",
        90,
        2100000,
        "Lộ trình 90 ngày định hình đường cong quyến rũ S-line cho phái đẹp với sự hỗ trợ của huấn luyện viên nữ.",
        "female",
        "Hot Nữ VIP",
        "HLV nữ đồng hành riêng 1:1 mỗi tuần; Thực đơn dinh dưỡng Healthy Meal Plan; Xông hơi tinh dầu dưỡng da sau tập; Miễn phí nước uống Collagen",
        "Cam kết thon gọn toàn thân và giảm tối thiểu 3-5kg mỡ thừa",
        1,
    ),

    # Cho Nam
    (
        "Gói Men Power (Cắt Nét & Tăng Cơ Ngực Vai)",
        30,
        800000,
        "Chương trình Hypertrophy tăng cơ tối đa: tập trung phát triển thân trên V-Taper (ngực dày, vai rộng, lưng xô dày).",
        "male",
        "Dành Cho Nam",
        "Khu tạ nặng Free Weight chuyên nghiệp tạ đơn đến 50kg; Dụng cụ Powerlifting & Khung gánh tạ chuẩn thi đấu; Thực đơn nạp Protein & Calo chuẩn macro",
        "Cam kết tăng sức mạnh đẩy ngực và kích thước bắp tay sau 4 tuần",
        1,
    ),
    (
        "Gói Thể Hình Chiến Binh (Spartan Beast 3 Tháng)",
        90,
        2250000,
        "Chương trình Bulking & Cutting kết hợp rèn luyện sức bền, phát triển cơ bắp toàn diện và sức mạnh bộc phát.",
        "male",
        "Nam Giới Mạnh Mẽ",
        "Kiểm tra khối lượng cơ xương InBody; Tặng 4 buổi hướng dẫn kỹ thuật Squat - Bench - Deadlift; Hỗ trợ lập giáo án Progressive Overload",
        "Cam kết tăng 2-3kg cơ nạc nguyên chất không tích mỡ thừa",
        1,
    ),

    # Tăng Cân / Tăng Cơ
    (
        "Gói Tăng Cân & Tăng Cơ Nạc (Lean Bulking Pro)",
        30,
        850000,
        "Dành cho người gầy khó tăng cân: Kết hợp kích thích phát triển sợi cơ và chế độ ăn dư thừa calo khoa học.",
        "gain_muscle",
        "Tăng Cân Tăng Cơ",
        "Giáo án tập kích thích hấp thu dinh dưỡng; Lập biểu đồ Calorie Surplus cá nhân; Theo dõi cân nặng và % cơ hàng tuần; Miễn phí bình lắc Whey Protein",
        "Cam kết tăng từ 2 - 4kg an toàn, không tích nước, không mỡ bụng",
        1,
    ),
    (
        "Gói Siêu Tăng Trưởng Cơ Bắp (Mass Gainer 3 Tháng)",
        90,
        2400000,
        "Lộ trình bứt phá thể trọng 3 tháng: Xây dựng nền tảng cơ bắp dày dặn, cải thiện hệ tiêu hóa và tăng cường trao đổi chất.",
        "gain_muscle",
        "Tăng Khối Cơ",
        "Tặng 3 buổi tập PT chỉnh form bài compound; Cung cấp công thức bữa phụ giàu năng lượng; Đo chỉ số chuyển hóa cơ bản BMR",
        "Cam kết tăng cân bền vững từ 4 - 6kg sau 3 tháng",
        1,
    ),

    # Giảm Cân / Giảm Mỡ
    (
        "Gói Siết Mỡ Thần Tốc (Fat Burner HIIT & Cardio)",
        30,
        850000,
        "Đốt cháy calo tối đa với các bài tập Circuit Training, HIIT và tạ kháng lực: Thúc đẩy quá trình oxy hóa mỡ thừa 24h sau tập.",
        "lose_weight",
        "Giảm Cân Nhanh",
        "Giáo án kích hoạt nhịp tim vùng đốt mỡ (Zone 2 - Zone 3); Thực đơn thâm hụt calo Calorie Deficit không bỏ đói; Đo lượng mỡ nội tạng InBody",
        "Cam kết giảm từ 2 - 4kg mỡ thừa sau 1 tháng tập luyện nghiêm túc",
        1,
    ),
    (
        "Gói Thon Gọn Bền Vững (Slim Fit 90 Ngày)",
        90,
        2350000,
        "Chương trình chuyển hóa vóc dáng toàn diện trong 90 ngày: Tiêu giảm mỡ bụng, mỡ đùi và nâng cao sức bền tim mạch.",
        "lose_weight",
        "Giảm Mỡ Bụng",
        "HLV theo dõi nhật ký ăn uống hàng ngày; Đổi mới giáo án mỗi 3 tuần tránh chững cân; Tặng đai quấn hỗ trợ siết eo cao cấp",
        "Cam kết giảm từ 5 - 8kg và giảm 8-12cm vòng bụng",
        1,
    ),

    # Gói PT Cá Nhân
    (
        "Gói Huấn Luyện Viên Riêng 1:1 (Private Trainer VIP)",
        30,
        2500000,
        "Huấn luyện viên kèm cặp sát sao từng buổi tập: Chỉnh sửa tư thế, đảm bảo an toàn tuyệt đối và đẩy giới hạn bản thân.",
        "personal_trainer",
        "PT 1:1 Kèm Riêng",
        "12 buổi tập riêng 1:1 cùng PT chuyên nghiệp NASM/ACE; Giáo án thiết kế độc quyền 100% theo thể trạng; Theo dõi sát sao 24/7 qua Zalo",
        "Cam kết đạt 100% mục tiêu hình thể đã thỏa thuận trước khi bắt đầu",
        1,
    ),
    (
        "Gói Master PT VIP Đồng Hành (24 Buổi Kèm Riêng)",
        60,
        4800000,
        "Lộ trình biến đổi thể chất đỉnh cao cùng Huấn luyện viên trưởng: Phục hồi chức năng, tăng cơ cắt nét hoặc ép cân cấp tốc.",
        "personal_trainer",
        "Master PT",
        "24 buổi tập cá nhân hóa 1:1; Đánh giá chuyển động khớp FMS; Lên thực đơn ăn sạch Eat Clean theo tuần; Phòng VIP riêng biệt",
        "Cam kết thay đổi hoàn toàn vóc dáng và thói quen sinh hoạt",
        1,
    ),

    # Gói Sinh Viên
    (
        "Gói Năng Động Sinh Viên (Student Pass 1 Tháng)",
        30,
        350000,
        "Ưu đãi trợ giá đặc quyền dành cho Học sinh - Sinh viên (xuất trình thẻ SV): Tập luyện không giới hạn khung giờ.",
        "student",
        "Ưu Đãi SV -45%",
        "Áp dụng mọi khung giờ kể cả giờ cao điểm; Miễn phí gửi xe và tủ đồ; Hướng dẫn máy tập miễn phí trong tuần đầu; Tham gia CLB Fitness sinh viên",
        "Cam kết giá tốt nhất khu vực, trang thiết bị hiện đại chuẩn quốc tế",
        1,
    ),
    (
        "Gói Sinh Viên Siêu Tiết Kiệm (Student Term 3 Tháng)",
        90,
        950000,
        "Gói tập 1 học kỳ dành riêng cho sinh viên: Tiết kiệm tối đa chi phí với mức giá chỉ hơn 300k/tháng.",
        "student",
        "Tiết Kiệm Nhất",
        "Bảo lưu gói tập đến 15 ngày vào mùa thi cử; Tặng 1 áo thun Gym AI phong cách; Miễn phí đo InBody 1 lần/tháng",
        "Môi trường tập luyện trẻ trung, năng động và văn minh",
        1,
    ),
]

for name, duration, price, desc, cat, badge, ben, comm, feat in rich_packages:
    # Check if package exists
    c.execute("SELECT id FROM packages WHERE name = ?", (name,))
    if not c.fetchone():
        c.execute("""
            INSERT INTO packages (name, duration_days, price, description, category, badge, benefits, commitments, featured, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """, (name, duration, price, desc, cat, badge, ben, comm, feat))
        print(f"Inserted package: {name}")

conn.commit()
conn.close()
print("All rich packages seeded successfully!")
