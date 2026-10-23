# Eraweb Tester Hub (era-tester)

> Nền tảng quản lý kịch bản kiểm thử (QA/QC), sơ đồ luồng người dùng (React Flow) và phân tích tự động thay đổi Git (Git Impact Analysis) cho Eraweb.

## Tính năng nổi bật

- **Kiến trúc Next.js 16 & React 19:** Tốc độ cao, Turbopack, Server Actions.
- **Sơ đồ mô phỏng tương tác (React Flow):** Trực quan hóa các bước kiểm thử theo dạng Node liên kết mượt mà với trạng thái màu sắc (`Passed`, `Bug`, `Fixing`, `Verifying`, `Git Change`).
- **Bảng Kanban theo dõi Bug:** Kéo thả trực quan 5 cột: `NEW` ➔ `FIX` ➔ `VERIFY` ➔ `DEPLOY` ➔ `CLOSED`.
- **Tự động nhận diện Git Push:** GitHub Webhook bắt sự kiện push vào nhánh `tester`, đối chiếu `file_patterns` của module và gắn cờ cảnh báo re-test tự động.
- **Hệ thống Email thông báo:** Tích hợp AWS SES thông báo cho Dev khi có Bug mới và báo cho Tester khi code thay đổi hoặc bug đã fix.
- **Upload bằng chứng lỗi:** Tải ảnh/video screenshot lỗi trực tiếp lên AWS S3.
- **Phê duyệt người dùng:** Super Admin gate phê duyệt thành viên trước khi cấp quyền truy cập.

## Khởi chạy cục bộ

```bash
npm install
npm run dev # Port 3008
```

Truy cập: `http://localhost:3008`
Không có tài khoản mặc định. Đặt `ADMIN_INITIAL_EMAIL` (cùng `JWT_SECRET` ≥ 32 byte và `ERA_TESTER_PASSWORD`) trong `.env.local`, rồi đăng ký chính email đó trên DB rỗng để tạo Super Admin đầu tiên; mật khẩu do bạn tự chọn khi đăng ký.
