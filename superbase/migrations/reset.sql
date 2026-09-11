-- CẢNH BÁO: file này xóa toàn bộ schema và dữ liệu ứng dụng.
-- Chỉ chạy trên project development sau khi đã tắt Custom Access Token Hook.
-- Tài khoản trong auth.users được giữ nguyên.

begin;

drop trigger if exists assign_default_user_role on auth.users;

drop function if exists public.admin_set_role_permission(
  public.app_role,
  public.app_permission,
  boolean
);
drop function if exists public.admin_list_role_permissions();
drop function if exists public.admin_update_user_role(uuid, public.app_role);
drop function if exists public.admin_list_users();
drop function if exists public.custom_access_token_hook(jsonb);
drop function if exists public.assign_default_user_role();

drop table if exists public.role_permissions cascade;
drop table if exists public.user_roles cascade;
drop table if exists public.todos cascade;

drop function if exists public.authorize(public.app_permission);
drop function if exists public.set_updated_at();
drop type if exists public.app_permission cascade;
drop type if exists public.app_role cascade;

commit;
