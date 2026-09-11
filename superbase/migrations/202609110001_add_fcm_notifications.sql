-- Thêm lưu FCM token và quyền gửi thông báo vào database đang tồn tại.
-- Chạy file này sau init.sql. Không cần chạy reset.sql.

-- PostgreSQL yêu cầu commit enum value mới trước khi dùng trong function/data.
begin;

alter type public.app_permission
  add value if not exists 'users.update_fcm_token';
alter type public.app_permission
  add value if not exists 'notifications.send';

commit;

begin;

create table if not exists public.user_notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  fcm_token text not null check (char_length(fcm_token) between 1 and 4096),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_notification_settings is
  'FCM registration token dùng để gửi thông báo tới thiết bị của user.';

alter table public.user_notification_settings enable row level security;
revoke all on table public.user_notification_settings
  from authenticated, anon, public;

create or replace function public.set_user_notification_settings_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists user_notification_settings_set_updated_at
  on public.user_notification_settings;
create trigger user_notification_settings_set_updated_at
before update on public.user_notification_settings
for each row execute function public.set_user_notification_settings_updated_at();

-- super_admin luôn có toàn bộ permission, gồm hai permission mới.
insert into public.role_permissions (role, permission)
values
  ('super_admin', 'users.update_fcm_token'),
  ('super_admin', 'notifications.send')
on conflict (role, permission) do nothing;

-- Thay đổi return type nên cần drop rồi tạo lại function danh sách user.
drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  role public.app_role,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  fcm_token text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.authorize('users.read') then
    raise exception 'Bạn không có quyền xem danh sách user.'
      using errcode = '42501';
  end if;

  return query
  select
    auth_user.id,
    auth_user.email::text,
    coalesce(user_role.role, 'user'::public.app_role),
    auth_user.created_at,
    auth_user.last_sign_in_at,
    notification_settings.fcm_token
  from auth.users as auth_user
  left join public.user_roles as user_role
    on user_role.user_id = auth_user.id
  left join public.user_notification_settings as notification_settings
    on notification_settings.user_id = auth_user.id
  order by auth_user.created_at desc;
end;
$$;

revoke execute on function public.admin_list_users()
  from public, anon;
grant execute on function public.admin_list_users()
  to authenticated;

create or replace function public.admin_update_user_fcm_token(
  target_user_id uuid,
  new_fcm_token text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_fcm_token text;
begin
  if not public.authorize('users.update_fcm_token') then
    raise exception 'Bạn không có quyền cập nhật FCM token.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from auth.users where id = target_user_id
  ) then
    raise exception 'Không tìm thấy user.'
      using errcode = 'P0002';
  end if;

  normalized_fcm_token := nullif(btrim(new_fcm_token), '');

  if normalized_fcm_token is null then
    delete from public.user_notification_settings
    where user_id = target_user_id;
    return;
  end if;

  if char_length(normalized_fcm_token) > 4096 then
    raise exception 'FCM token không được dài quá 4096 ký tự.'
      using errcode = '22001';
  end if;

  insert into public.user_notification_settings (user_id, fcm_token)
  values (target_user_id, normalized_fcm_token)
  on conflict (user_id) do update
  set fcm_token = excluded.fcm_token;
end;
$$;

revoke execute on function public.admin_update_user_fcm_token(uuid, text)
  from public, anon;
grant execute on function public.admin_update_user_fcm_token(uuid, text)
  to authenticated;

create or replace function public.admin_get_user_fcm_token(
  target_user_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  user_fcm_token text;
begin
  if not public.authorize('notifications.send') then
    raise exception 'Bạn không có quyền gửi thông báo.'
      using errcode = '42501';
  end if;

  select fcm_token
  into user_fcm_token
  from public.user_notification_settings
  where user_id = target_user_id;

  if user_fcm_token is null then
    raise exception 'User chưa có FCM token.'
      using errcode = 'P0002';
  end if;

  return user_fcm_token;
end;
$$;

revoke execute on function public.admin_get_user_fcm_token(uuid)
  from public, anon;
grant execute on function public.admin_get_user_fcm_token(uuid)
  to authenticated;

commit;
