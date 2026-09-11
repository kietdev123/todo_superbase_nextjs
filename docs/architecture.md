# Kiến trúc hệ thống

## Thành phần

- `web_admin`: ứng dụng Next.js App Router; browser kết nối trực tiếp tới Supabase. Route Handler duy nhất là health check.
- Supabase Auth: xác thực user và chạy Custom Access Token Hook để thêm claim `user_role`.
- Supabase Postgres: lưu todo, role, permission và FCM token; Row Level Security kiểm soát dữ liệu.
- Postgres RPC: cung cấp thao tác quản trị user/role an toàn mà không đưa `service_role` key ra browser.
- Supabase Edge Functions: `todos-summary` trả thống kê todo; `send-fcm-notification` gửi thông báo bằng FCM HTTP v1.

## Luồng đăng nhập và dữ liệu

1. User đăng nhập tại `/login` bằng Supabase browser client.
2. Supabase Auth xác thực và Custom Access Token Hook đưa `user_role` vào JWT.
3. Browser client lưu session trong cookie; Next.js proxy làm mới session.
4. Server Component đọc claim bằng `getClaims()` để hiển thị đúng giao diện.
5. Browser gọi Supabase PostgREST/RPC bằng access token; database quyết định quyền bằng RLS/RBAC.

## Role và permission

- `user`: mặc định chỉ thao tác todo có `owner_id = auth.uid()`.
- `admin`: mặc định có ba permission thao tác todo của mọi user.
- `super_admin`: có toàn bộ permission, được mở màn hình quản lý user và role.

Các permission hiện có:

- `todos.select_all`, `todos.update_all`, `todos.delete_all`.
- `users.read`, `users.update_role`.
- `users.update_fcm_token`, `notifications.send`.
- `roles.read`, `roles.update_permission`.

`admin_list_users` và `admin_update_user_role` là RPC quản lý user. `admin_list_role_permissions` và `admin_set_role_permission` là RPC quản lý ánh xạ role-permission. Các hàm chạy `security definer` để truy cập dữ liệu cần thiết, nhưng luôn gọi `authorize(...)` trước và chỉ cấp quyền thực thi cho role Postgres `authenticated`.

Permission của `super_admin` không thể bị tắt qua RPC. RPC đổi role cũng ngăn hạ role của super admin cuối cùng để tránh khóa toàn bộ quyền quản trị.

JWT không cập nhật ngay khi database đổi role. User phải đăng xuất và đăng nhập lại để nhận claim mới.

## Luồng gửi thông báo FCM

1. Super admin lưu registration token bằng RPC `admin_update_user_fcm_token`.
2. Token được lưu trong `user_notification_settings`; bảng không cấp quyền trực tiếp cho `authenticated` hoặc `anon`.
3. Khi bấm gửi, browser gọi Edge Function `send-fcm-notification` bằng Supabase session JWT.
4. Edge Function gọi RPC `admin_get_user_fcm_token`; RPC chỉ trả token khi JWT có permission `notifications.send`.
5. Edge Function đọc `FIREBASE_SERVICE_ACCOUNT_JSON` từ Supabase Secrets, tạo OAuth access token ngắn hạn và gọi FCM HTTP v1.

Firebase private key không đi qua Next.js, browser hoặc Postgres.

## Docker

- Development dùng target `development`, mount source và chạy `next dev`; Fast Refresh nhận thay đổi code.
- Production dùng target `production`, chỉ chứa output standalone và chạy bằng user không phải root; source không được mount.
- Node.js, Alpine và npm dependency đều được pin phiên bản cụ thể.
