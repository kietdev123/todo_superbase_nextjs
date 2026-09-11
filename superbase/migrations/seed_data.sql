-- Tài khoản Auth phải được tạo trước tại Supabase Dashboard.
-- Thay email bên dưới bằng email tài khoản cần cấp role super_admin rồi chạy file.

begin;

do $$
declare
  super_admin_email text := 'super_admin@example.com';
  super_admin_user_id uuid;
begin
  select id
  into super_admin_user_id
  from auth.users
  where lower(email) = lower(super_admin_email);

  if super_admin_user_id is null then
    raise exception
      'Không tìm thấy tài khoản %. Hãy tạo tài khoản trong Authentication > Users và sửa email trong seed_data.sql.',
      super_admin_email;
  end if;

  insert into public.user_roles (user_id, role)
  values (super_admin_user_id, 'super_admin')
  on conflict (user_id) do update
  set role = excluded.role;
end;
$$;

commit;
