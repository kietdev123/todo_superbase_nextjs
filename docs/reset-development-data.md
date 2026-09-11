# Reset dữ liệu development

> Cảnh báo: `reset.sql` xóa dữ liệu ứng dụng và không thể hoàn tác. Chỉ chạy sau khi đã kiểm tra đúng project development.

## Phạm vi của từng file

- `superbase/migrations/reset.sql`: reset schema nền và giữ tài khoản trong `auth.users`. File không chứa object được thêm bởi migration FCM.
- `superbase/migrations/init.sql`: tạo lại schema, RBAC, RLS và các RPC. File không seed dữ liệu.
- `superbase/migrations/202609110001_add_fcm_notifications.sql`: bổ sung bảng, permission và RPC FCM sau khi chạy `init.sql`.
- `superbase/migrations/202609110002_add_paginated_user_list.sql`: bổ sung RPC lấy danh sách user theo trang.
- `superbase/migrations/seed_data.sql`: chỉ cập nhật tài khoản được cấu hình thành role `super_admin`.

## Reset đầy đủ nhưng giữ tài khoản Auth

1. Mở **Supabase Dashboard > Authentication > Hooks**.
2. Tắt **Custom Access Token Hook** để Auth không gọi function trong lúc function bị xóa và tạo lại.
3. Mở **SQL Editor > New query**.
4. Dán và chạy toàn bộ `superbase/migrations/reset.sql`.
5. Dán và chạy toàn bộ `superbase/migrations/init.sql`.
6. Dán và chạy toàn bộ `superbase/migrations/202609110001_add_fcm_notifications.sql`.
7. Dán và chạy toàn bộ `superbase/migrations/202609110002_add_paginated_user_list.sql`.
8. Kiểm tra tài khoản super admin vẫn còn trong **Authentication > Users**. Nếu chưa có, tạo thủ công bằng email và mật khẩu.
9. Mở `superbase/migrations/seed_data.sql`, thay `super_admin@example.com` bằng email tài khoản trên, rồi chạy file.
10. Quay lại **Authentication > Hooks**, bật hook và chọn `public.custom_access_token_hook`.
11. Đăng xuất rồi đăng nhập lại để nhận JWT mới.

Vì `reset.sql` được giữ nguyên theo schema nền, bảng FCM không bị xóa. Nếu muốn xóa FCM token trong development, chạy trước:

```sql
truncate table public.user_notification_settings;
```

Nếu email trong `seed_data.sql` không khớp tài khoản Auth, transaction sẽ báo lỗi và không seed một phần dữ liệu.

## Xóa luôn tài khoản Auth

Cách dễ kiểm tra nhất là mở **Authentication > Users**, chọn đúng tài khoản và dùng **Delete user**. Sau đó tạo lại tài khoản super admin trước khi chạy `seed_data.sql`.

Nếu chủ động muốn xóa tất cả tài khoản bằng SQL trên project development:

```sql
delete from auth.users;
```

Lệnh này không nằm trong `reset.sql` để tránh vô tình xóa thông tin đăng nhập.

## Chỉ xóa todo

```sql
truncate table public.todos;
```

Không cần tắt Custom Access Token Hook nếu chỉ chạy lệnh này.
