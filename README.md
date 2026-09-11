# Todo Admin với Supabase và Next.js

Repo mẫu cho web admin dùng **Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui + Lucide**. Browser kết nối trực tiếp Supabase để đăng nhập, thao tác dữ liệu theo RLS/RBAC, gọi Postgres RPC quản trị và Edge Function gửi FCM. Next.js không làm lớp API trung gian; API nội bộ duy nhất là health check.

## Cấu trúc thư mục

```text
.
├── superbase/
│   ├── functions/
│   │   ├── todos-summary/         # Edge Function thống kê todo
│   │   └── send-fcm-notification/ # Edge Function gửi FCM
│   └── migrations/
│       ├── reset.sql              # Xóa schema và dữ liệu ứng dụng
│       ├── init.sql               # Tạo schema, RBAC, RLS và RPC
│       ├── seed_data.sql          # Gán role super_admin cho tài khoản đã có
│       └── 202609110001_add_fcm_notifications.sql
│                                  # Migration bổ sung FCM, không reset dữ liệu
├── web_admin/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/     # Trang đăng nhập Supabase Auth
│   │   │   ├── (admin)/          # Layout và các route được bảo vệ
│   │   │   │   ├── dashboard/
│   │   │   │   ├── todos/
│   │   │   │   ├── users/
│   │   │   │   └── roles/
│   │   │   └── health/           # GET /health
│   │   ├── components/
│   │   │   ├── layout/           # Sidebar, Header, UserMenu, AdminShell
│   │   │   ├── common/           # Component dùng lại giữa các màn hình
│   │   │   └── ui/               # Primitive theo chuẩn shadcn/ui
│   │   ├── config/               # App, menu và nội dung Anh/Việt
│   │   ├── constants/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api/health.ts
│   │   │   └── supabase/         # Browser client và server client tách riêng
│   │   └── types/
│   ├── components.json           # Cấu hình shadcn/ui
│   ├── Dockerfile
│   └── package.json              # Version hiển thị trên sidebar/dashboard
├── docs/                          # Tài liệu kiến trúc và Dashboard
├── docker-compose.dev.yml         # Dev có Fast Refresh
├── docker-compose.prod.yml        # Production dùng image bất biến
└── .env.example                   # Biến môi trường mẫu
```

Tên thư mục `superbase` được giữ theo quy ước của repo. Dịch vụ và SDK bên trong vẫn là Supabase.

## Web admin

Admin shell gồm **Sidebar + Header + Content**:

- Sidebar hiển thị logo/tên hệ thống, menu đang active, hỗ trợ thu gọn trên desktop và hiển thị version lấy trực tiếp từ `web_admin/package.json`.
- Header hiển thị tài khoản đang đăng nhập. Bấm vào tài khoản để xem tên/email, đổi ngôn ngữ **Tiếng Việt/English**, chọn theme **Sáng/Tối/Theo hệ thống** hoặc đăng xuất.
- Lựa chọn ngôn ngữ và trạng thái thu gọn sidebar được lưu trong `localStorage`; theme do `next-themes` quản lý.
- Menu được khai báo tập trung tại `web_admin/src/config/navigation.ts`; tên ứng dụng và version nằm tại `web_admin/src/config/app.ts`; nội dung song ngữ nằm tại `web_admin/src/config/i18n.ts`.
- Các component dùng lại gồm `PageHeader`, `DataTable`, `Loading`, `EmptyState`, `ConfirmDialog` và `StatusBadge`.

Các route chính:

| Route | Quyền | Chức năng |
| --- | --- | --- |
| `/login` | Công khai | Đăng nhập bằng Supabase Auth |
| `/dashboard` | Đã đăng nhập | Trạng thái Supabase, health API và version |
| `/todos` | Đã đăng nhập | Quản lý todo theo RLS/RBAC |
| `/users` | `super_admin` | Cập nhật role, FCM token và gửi thông báo |
| `/roles` | `super_admin` | Bật/tắt permission đã định nghĩa sẵn |
| `/health` | Công khai | Health check của web admin |

Các URL cũ `/admin`, `/admin/users`, `/admin/roles` vẫn được redirect tương ứng để không làm hỏng bookmark.

## Mô hình phân quyền

Repo áp dụng mô hình [Custom Claims và RBAC của Supabase](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac):

| Role | Quyền mặc định |
| --- | --- |
| `user` | Chỉ đọc, tạo, sửa và xóa todo của chính mình |
| `admin` | Thao tác toàn bộ todo |
| `super_admin` | Có mọi permission, quản lý user/role/FCM và gửi thông báo |

`user_roles` lưu role của user, `role_permissions` ánh xạ role với permission, Custom Access Token Hook đưa `user_role` vào JWT và RLS gọi `authorize(permission)` để kiểm tra quyền.

Browser không được đọc trực tiếp bảng `auth.users` và không giữ `service_role` hoặc Firebase private key. Hai màn hình quản trị gọi Postgres RPC bằng access token của user; thao tác gửi FCM gọi Edge Function đã được bảo vệ bằng JWT và RBAC.

## Khởi tạo Supabase

1. Tạo project Supabase.
2. Mở **SQL Editor**, chạy toàn bộ file `superbase/migrations/init.sql`.
3. Chạy migration `superbase/migrations/202609110001_add_fcm_notifications.sql`.
4. Vào **Authentication > Hooks > Custom Access Token Hook**, bật hook và chọn `public.custom_access_token_hook`.
5. Vào **Authentication > Users > Add user**, tự tạo tài khoản super admin bằng email và mật khẩu.
6. Mở `superbase/migrations/seed_data.sql`, thay `super_admin@example.com` bằng đúng email vừa tạo rồi chạy file trong SQL Editor.
7. Đăng xuất và đăng nhập lại để JWT chứa claim `user_role = super_admin`.
8. Thiết lập Firebase key và deploy `send-fcm-notification` theo [hướng dẫn FCM](docs/fcm-notifications.md).
9. Nếu ứng dụng không cho tự đăng ký, tắt đăng ký công khai trong Email Provider.

`seed_data.sql` không tạo tài khoản Auth, mật khẩu hay permission. File chỉ cập nhật tài khoản theo email thành role `super_admin`. Permission nền được cấu hình trong `init.sql`; permission FCM được thêm bởi migration mới.

Sau khi đăng nhập, user được chuyển tới `/dashboard`. `user` và `admin` có màn hình tổng quan/todo; riêng `super_admin` nhìn thấy thêm menu `/users` và `/roles`.

Không có UI tạo, sửa hoặc xóa định nghĩa permission. Permission của `super_admin` luôn bật; hệ thống cũng không cho hạ role của super admin cuối cùng.

## Thông báo FCM

Mỗi user có tối đa một FCM registration token trong `user_notification_settings`. Super admin lưu token tại `/users`, sau đó bấm **Gửi thông báo** và nhập tiêu đề/nội dung.

Edge Function `send-fcm-notification`:

- xác thực Supabase JWT của người gọi;
- kiểm tra permission `notifications.send`;
- lấy token qua RPC, không cho browser đọc bảng token trực tiếp;
- tạo OAuth access token ngắn hạn từ Firebase service account;
- gửi message bằng FCM HTTP v1.

Firebase service-account JSON phải được lưu trong Supabase Edge Function Secrets với tên `FIREBASE_SERVICE_ACCOUNT_JSON`. Không thêm key này vào `.env`, source code hoặc Docker của `web_admin`. Xem [Thiết lập gửi thông báo FCM](docs/fcm-notifications.md).

## Cấp và thu hồi quyền

Cách thông thường là đăng nhập bằng `super_admin`, mở `/admin/users`, chọn role mới rồi bấm **Lưu**. User vừa bị đổi role phải đăng xuất và đăng nhập lại vì JWT hiện tại chưa tự nhận claim mới.

Có thể thao tác thủ công trong SQL Editor khi cần khôi phục quyền.

### Cấp role

Thay email và role trong câu lệnh sau. Role hợp lệ gồm `super_admin`, `admin`, `user`:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where email = 'admin@example.com'
on conflict (user_id) do update
set role = excluded.role;
```

Để cấp super admin, đổi `'admin'` thành `'super_admin'`.

### Thu hồi quyền admin

Chuyển user về role `user`:

```sql
insert into public.user_roles (user_id, role)
select id, 'user'::public.app_role
from auth.users
where email = 'admin@example.com'
on conflict (user_id) do update
set role = excluded.role;
```

Kiểm tra kết quả:

```sql
select auth.users.id, auth.users.email, public.user_roles.role
from auth.users
join public.user_roles on public.user_roles.user_id = auth.users.id
where auth.users.email = 'admin@example.com';
```

Không chỉnh role trong `auth.users.raw_app_meta_data`. Sau mọi thay đổi role, user cần đăng nhập lại.

## Reset môi trường development

Các file SQL có trách nhiệm tách biệt:

- `reset.sql`: reset schema nền và giữ tài khoản trong `auth.users`; file không chứa thay đổi FCM.
- `init.sql`: chỉ tạo schema, enum, bảng, function, trigger, policy và grant.
- `seed_data.sql`: chỉ gán role `super_admin` cho tài khoản Auth đã có.
- `202609110001_add_fcm_notifications.sql`: thêm schema, permission và RPC FCM lên database hiện có.

Thứ tự reset đầy đủ:

1. Kiểm tra đúng project development.
2. Tắt Custom Access Token Hook.
3. Chạy `reset.sql`.
4. Chạy `init.sql`.
5. Chạy `202609110001_add_fcm_notifications.sql`.
6. Sửa email trong `seed_data.sql`, bảo đảm tài khoản đó đã tồn tại, rồi chạy file.
7. Bật lại Custom Access Token Hook với `public.custom_access_token_hook`.
8. Đăng xuất và đăng nhập lại.

Xem thêm [Hướng dẫn reset dữ liệu development](docs/reset-development-data.md).

## Cấu hình môi trường

```bash
cp .env.example .env
```

Điền hai biến sau:

- `NEXT_PUBLIC_SUPABASE_URL`: URL project Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable key; project cũ có thể dùng anon key.

Không dùng `service_role` key trong web app.

## Chạy bằng Docker

### Development

```bash
docker compose -f docker-compose.dev.yml up --build
```

Mở <http://localhost:3000>. Source được mount vào container và Next.js Fast Refresh tự cập nhật khi code thay đổi. Nếu đổi `package.json` hoặc `package-lock.json`, chạy lại lệnh có `--build`.

Nếu cổng 3000 đang được ứng dụng khác sử dụng, chọn cổng khác mà không cần sửa compose:

```bash
WEB_ADMIN_PORT=3100 docker compose -f docker-compose.dev.yml up --build
```

Khi đó mở <http://localhost:3100>. Có thể lưu `WEB_ADMIN_PORT=3100` trong `.env` để áp dụng cho cả dev và production.

Dừng dev:

```bash
docker compose -f docker-compose.dev.yml down
```

Xóa cả dependency/cache volume:

```bash
docker compose -f docker-compose.dev.yml down --volumes
```

### Production

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Production không mount source nên không tự cập nhật khi code đổi. Khi phát hành code hoặc đổi cấu hình Supabase, chạy lại lệnh trên để build image và tạo lại service.

Health check: <http://localhost:3000/health>.

## Chạy không dùng Docker

Yêu cầu đúng Node.js `24.20.0` và npm `11.19.0`.

Toàn bộ dependency trong `web_admin/package.json` được khóa bằng phiên bản cụ thể, không dùng `latest`, `^` hoặc `~`. Dùng `npm ci` để cài đúng `package-lock.json`.

```bash
cd web_admin
npm ci
npm run dev
```

Các lệnh chính:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
```

Repo không cấu hình test theo phạm vi hiện tại.

## API

- `GET /health`: health check công khai, được dashboard gọi qua module `web_admin/src/lib/api/health.ts`.

Không có API Next.js trung gian cho đăng nhập, todo, user hoặc role. Browser gọi Supabase trực tiếp và database áp dụng RLS/RBAC.

Edge Function có thêm:

- `POST /functions/v1/send-fcm-notification`: gửi FCM tới token của một user; yêu cầu JWT và permission `notifications.send`.

## Tài liệu thêm

- [Kiến trúc và luồng xác thực](docs/architecture.md)
- [Thao tác trên Supabase Dashboard](docs/supabase-dashboard.md)
- [Thiết lập gửi thông báo FCM](docs/fcm-notifications.md)
- [Reset dữ liệu development](docs/reset-development-data.md)
