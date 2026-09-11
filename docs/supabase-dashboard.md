# Thao tác trên Supabase Dashboard

Repo chỉ lưu mã nguồn Supabase. Dev tự áp dụng thay đổi lên project bằng Dashboard.

## Khởi tạo database

1. Mở **SQL Editor > New query**.
2. Dán và chạy `superbase/migrations/init.sql`.
3. Dán và chạy `superbase/migrations/202609110001_add_fcm_notifications.sql`.
4. Dán và chạy `superbase/migrations/202609110002_add_paginated_user_list.sql`.
5. Vào **Authentication > Hooks > Custom Access Token Hook**.
6. Bật hook và chọn `public.custom_access_token_hook`.
7. Kiểm tra bảng và policy trong **Table Editor**.

`init.sql` chỉ tạo object database. Nếu object đã tồn tại và cần tạo lại trong development, làm đúng quy trình tại [Reset dữ liệu development](reset-development-data.md).

## Tạo tài khoản super admin

1. Vào **Authentication > Users > Add user**.
2. Tự tạo tài khoản bằng email và mật khẩu.
3. Mở `superbase/migrations/seed_data.sql` và thay `super_admin@example.com` bằng email vừa tạo.
4. Chạy toàn bộ `seed_data.sql` trong SQL Editor.
5. Đăng xuất rồi đăng nhập lại.

File seed không tạo tài khoản hoặc mật khẩu; file chỉ cập nhật role của tài khoản Auth đã tồn tại thành `super_admin`.

## Quản lý role

Sau khi đăng nhập bằng super admin:

- Mở `/users` để xem user và đổi role giữa `super_admin`, `admin`, `user`.
- Tại `/users`, lưu FCM token và gửi thông báo tới từng user.
- Mở `/roles` để bật/tắt permission đã định nghĩa sẵn.

Sau khi đổi role, tài khoản bị thay đổi phải đăng nhập lại. Không cấp quyền trực tiếp cho `authenticated`/`anon` trên `user_roles`, `role_permissions` hoặc `auth.users`.

## Tạo Edge Function

1. Chọn **Edge Functions > Deploy a new function > Via Editor**.
2. Đặt tên `todos-summary`.
3. Dán nội dung `superbase/functions/todos-summary/index.ts`.
4. Deploy và giữ bật kiểm tra JWT.
5. Gọi function bằng access token của user:

```bash
curl "https://PROJECT_REF.supabase.co/functions/v1/todos-summary" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

Edge Function dùng `SUPABASE_URL` và `SUPABASE_ANON_KEY` do Supabase cung cấp. Không đưa service role key vào source.

## Tạo Edge Function gửi FCM

1. Nếu database đã tồn tại, chạy `superbase/migrations/202609110001_add_fcm_notifications.sql` trong SQL Editor. Không chạy lại `init.sql` hoặc `reset.sql`.
2. Tạo Firebase service-account JSON và lưu vào **Edge Functions > Secrets** với tên `FIREBASE_SERVICE_ACCOUNT_JSON`.
3. Chọn **Edge Functions > Deploy a new function > Via Editor**.
4. Đặt tên `send-fcm-notification`.
5. Dán nội dung `superbase/functions/send-fcm-notification/index.ts` vào editor.
6. Deploy và giữ bật JWT verification.

Không đặt Firebase service-account JSON trong source hoặc `.env` của web admin. Xem hướng dẫn đầy đủ tại [Thiết lập gửi thông báo FCM](fcm-notifications.md).

## Lấy cấu hình web admin

Tại **Project Settings > API**, sao chép project URL và publishable key vào `.env`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```
