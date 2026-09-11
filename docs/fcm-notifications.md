# Thiết lập gửi thông báo Firebase Cloud Messaging

Ứng dụng dùng FCM HTTP v1. Web admin gọi Edge Function `send-fcm-notification` bằng session Supabase hiện tại; Edge Function kiểm tra permission `notifications.send`, đọc FCM token của user và gọi Firebase ở phía server bằng service-account key.

## 1. Chuẩn bị FCM token phía client

Ứng dụng mobile hoặc web nhận FCM registration token bằng Firebase SDK tương ứng. Repo này không chứa mã client tạo token; màn hình admin chỉ lưu token đã nhận được.

FCM token có thể thay đổi khi cài lại ứng dụng, xóa dữ liệu hoặc Firebase rotate token. Khi client nhận token mới, cần cập nhật lại tại `/admin/users`.

## 2. Tạo Firebase service-account key

1. Mở [Firebase Console](https://console.firebase.google.com/) và chọn đúng project.
2. Vào **Project settings > Cloud Messaging** và kiểm tra **Firebase Cloud Messaging API (V1)** đang được bật.
3. Vào **Project settings > Service accounts**.
4. Chọn **Firebase Admin SDK > Generate new private key** rồi xác nhận.
5. Firebase tải xuống một file JSON. Giữ file này ở nơi an toàn, không commit vào Git, không gửi cho browser và không đặt trong `.env` của `web_admin`.

Edge Function sử dụng ba trường trong file: `project_id`, `client_email`, `private_key`.

## 3. Lưu key trong Supabase Edge Function Secrets

1. Mở Supabase Dashboard của project.
2. Vào **Edge Functions > Secrets**.
3. Tạo secret có tên chính xác:

```text
FIREBASE_SERVICE_ACCOUNT_JSON
```

4. Dán toàn bộ nội dung JSON của file service account vào phần value rồi lưu.

Nếu Dashboard không nhận JSON nhiều dòng, tạo chuỗi JSON một dòng trên máy:

```bash
jq -c . /duong-dan/firebase-service-account.json
```

Sao chép output của lệnh vào value. Không đưa output này vào terminal log công khai, source code hoặc file được Git theo dõi.

## 4. Cập nhật database

Chạy file sau trong **Supabase Dashboard > SQL Editor**:

```text
superbase/migrations/202609110001_add_fcm_notifications.sql
```

Migration mới thêm:

- bảng `user_notification_settings` lưu một FCM token cho mỗi user;
- permission `users.update_fcm_token` và `notifications.send`;
- RPC cập nhật token và lấy token an toàn cho Edge Function.

Migration chạy trực tiếp trên database hiện có, không xóa todo, user, role hoặc dữ liệu khác. Không cần tắt Custom Access Token Hook và không cần chạy lại `init.sql`, `reset.sql` hay `seed_data.sql`.

Với project hoàn toàn mới, chạy theo thứ tự `init.sql`, migration FCM, rồi `seed_data.sql`.

## 5. Deploy Edge Function

1. Vào **Supabase Dashboard > Edge Functions > Deploy a new function > Via Editor**.
2. Đặt tên chính xác `send-fcm-notification`.
3. Dán nội dung file `superbase/functions/send-fcm-notification/index.ts`.
4. Deploy function và giữ bật xác thực JWT mặc định.

Function dùng dependency được pin phiên bản:

- `@supabase/supabase-js@2.116.0`;
- `google-auth-library@10.6.2`.

Không deploy function này với tùy chọn `--no-verify-jwt`.

## 6. Gửi thông báo từ admin

1. Đăng nhập bằng tài khoản `super_admin`.
2. Mở `/admin/users`.
3. Dán FCM registration token vào user cần nhận và bấm **Lưu token**.
4. Bấm **Gửi thông báo**.
5. Nhập tiêu đề, nội dung và xác nhận gửi.

Nút gửi bị khóa khi user chưa có token hoặc token đang được sửa nhưng chưa lưu.

## Xử lý lỗi thường gặp

- `User chưa có FCM token`: lưu token trước khi gửi.
- `Bạn không có quyền gửi thông báo`: đăng nhập lại bằng `super_admin` và kiểm tra Custom Access Token Hook.
- `Thiếu secret FIREBASE_SERVICE_ACCOUNT_JSON`: tạo secret đúng tên trong Supabase.
- Firebase trả `401` hoặc `403`: kiểm tra service account thuộc đúng project, FCM HTTP v1 đã bật và key chưa bị thu hồi.
- Firebase trả `UNREGISTERED`: token đã hết hiệu lực; lấy token mới từ client rồi cập nhật lại.
- Edge Function trả `401`: giữ JWT verification bật và gọi bằng Supabase client sau khi đăng nhập.

## Bảo mật và xoay khóa

- Service-account JSON chỉ tồn tại trong Supabase Edge Function Secrets.
- Không dùng Firebase key trong biến `NEXT_PUBLIC_*`.
- Chỉ `super_admin` có các permission FCM mặc định.
- Khi nghi ngờ key bị lộ, xóa key cũ trong Firebase/Google Cloud, tạo key mới và cập nhật secret cùng tên. Supabase áp dụng secret mới mà không cần deploy lại function.

Tham khảo: [Firebase FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api), [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets).
