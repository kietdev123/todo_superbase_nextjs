-- Thêm RPC lấy danh sách user theo trang.
-- Chạy sau 202609110001_add_fcm_notifications.sql. Không cần reset dữ liệu.

begin;

create or replace function public.admin_list_users_paginated(
  result_offset integer default 0,
  result_limit integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  response jsonb;
begin
  if not public.authorize('users.read') then
    raise exception 'Bạn không có quyền xem danh sách user.'
      using errcode = '42501';
  end if;

  if result_offset is null or result_offset < 0 then
    raise exception 'result_offset phải lớn hơn hoặc bằng 0.'
      using errcode = '22023';
  end if;

  if result_limit is null or result_limit < 1 or result_limit > 100 then
    raise exception 'result_limit phải nằm trong khoảng 1 đến 100.'
      using errcode = '22023';
  end if;

  select pg_catalog.jsonb_build_object(
    'items',
    coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'user_id', page_rows.user_id,
          'email', page_rows.email,
          'role', page_rows.role,
          'created_at', page_rows.created_at,
          'last_sign_in_at', page_rows.last_sign_in_at,
          'fcm_token', page_rows.fcm_token
        )
        order by page_rows.created_at desc
      ),
      '[]'::jsonb
    ),
    'total_count',
    (select pg_catalog.count(*) from auth.users)
  )
  into response
  from (
    select
      auth_user.id as user_id,
      auth_user.email::text as email,
      coalesce(user_role.role, 'user'::public.app_role) as role,
      auth_user.created_at,
      auth_user.last_sign_in_at,
      notification_settings.fcm_token
    from auth.users as auth_user
    left join public.user_roles as user_role
      on user_role.user_id = auth_user.id
    left join public.user_notification_settings as notification_settings
      on notification_settings.user_id = auth_user.id
    order by auth_user.created_at desc
    offset result_offset
    limit result_limit
  ) as page_rows;

  return response;
end;
$$;

comment on function public.admin_list_users_paginated(integer, integer) is
  'Lấy một trang user và tổng số user; yêu cầu permission users.read.';

revoke execute on function public.admin_list_users_paginated(integer, integer)
  from public, anon;
grant execute on function public.admin_list_users_paginated(integer, integer)
  to authenticated;

commit;
