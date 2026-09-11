# Todo Admin với Supabase và Next.js

Repo mẫu cho trang quản trị todo. Next.js kết nối trực tiếp tới Supabase để đăng nhập, thao tác todo và gọi các Postgres RPC quản trị. API Next.js duy nhất là health check.

## Cấu trúc thư mục

```text
.
├── superbase/
│   ├── functions/todos-summary/   # Mã nguồn Edge Function
│   └── migrations/
│       ├── reset.sql              # Xóa schema và dữ liệu ứng dụng
│       ├── init.sql               # Tạo schema, RBAC, RLS và RPC
│       └── seed_data.sql          # Gán role super_admin cho tài khoản đã có
├── web_admin/                     # Next.js client và API health check
├── docs/                          # Tài liệu kiến trúc và Dashboard
├── docker-compose.dev.yml         # Dev có Fast Refresh
├── docker-compose.prod.yml        # Production dùng image bất biến
└── .env.example                   # Biến môi trường mẫu
```

Tên thư mục `superbase` được giữ theo quy ước của repo. Dịch vụ và SDK bên trong vẫn là Supabase.

## Mô hình phân quyền

Repo áp dụng mô hình [Custom Claims và RBAC của Supabase](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac):

| Role | Quyền mặc định |
| --- | --- |
| `user` | Chỉ đọc, tạo, sửa và xóa todo của chính mình |
| `admin` | Thao tác toàn bộ todo |
| `super_admin` | Có mọi permission, thêm màn hình quản lý user và role |

`user_roles` lưu role của user, `role_permissions` ánh xạ role với permission, Custom Access Token Hook đưa `user_role` vào JWT và RLS gọi `authorize(permission)` để kiểm tra quyền.

Browser không được đọc trực tiếp bảng `auth.users` và không giữ `service_role` key. Hai màn hình quản trị gọi trực tiếp Postgres RPC bằng access token của user; từng RPC tự kiểm tra permission trước khi xử lý.

## Khởi tạo Supabase

1. Tạo project Supabase.
2. Mở **SQL Editor**, chạy toàn bộ file `superbase/migrations/init.sql`.
3. Vào **Authentication > Hooks > Custom Access Token Hook**, bật hook và chọn `public.custom_access_token_hook`.
4. Vào **Authentication > Users > Add user**, tự tạo tài khoản super admin bằng email và mật khẩu.
5. Mở `superbase/migrations/seed_data.sql`, thay `super_admin@example.com` bằng đúng email vừa tạo rồi chạy file trong SQL Editor.
6. Đăng xuất và đăng nhập lại để JWT chứa claim `user_role = super_admin`.
7. Nếu ứng dụng không cho tự đăng ký, tắt đăng ký công khai trong Email Provider.

`seed_data.sql` không tạo tài khoản Auth, mật khẩu hay permission. File chỉ cập nhật tài khoản theo email thành role `super_admin`. Permission mặc định đã được cấu hình trong `init.sql`.

Sau khi đăng nhập:

- `/admin`: quản lý todo.
- `/admin/users`: super admin xem danh sách user và cập nhật role.
- `/admin/roles`: super admin bật/tắt permission có sẵn của từng role.

Không có UI tạo, sửa hoặc xóa định nghĩa permission. Permission của `super_admin` luôn bật; hệ thống cũng không cho hạ role của super admin cuối cùng.

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

Ba file SQL có trách nhiệm tách biệt:

- `reset.sql`: chỉ xóa object và dữ liệu ứng dụng, giữ tài khoản trong `auth.users`.
- `init.sql`: chỉ tạo schema, enum, bảng, function, trigger, policy và grant.
- `seed_data.sql`: chỉ gán role `super_admin` cho tài khoản Auth đã có.

Thứ tự reset đầy đủ:

1. Kiểm tra đúng project development.
2. Tắt Custom Access Token Hook.
3. Chạy `reset.sql`.
4. Chạy `init.sql`.
5. Sửa email trong `seed_data.sql`, bảo đảm tài khoản đó đã tồn tại, rồi chạy file.
6. Bật lại Custom Access Token Hook với `public.custom_access_token_hook`.
7. Đăng xuất và đăng nhập lại.

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

Health check: <http://localhost:3000/api/health>.

## Chạy không dùng Docker

Yêu cầu đúng Node.js `24.20.0` và npm `11.19.0`.

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

- `GET /api/health`: health check công khai.

Không có API Next.js trung gian cho đăng nhập, todo, user hoặc role. Browser gọi Supabase trực tiếp và database áp dụng RLS/RBAC.

## Tài liệu thêm

- [Kiến trúc và luồng xác thực](docs/architecture.md)
- [Thao tác trên Supabase Dashboard](docs/supabase-dashboard.md)
- [Reset dữ liệu development](docs/reset-development-data.md)
