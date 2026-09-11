import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="page-shell">
      <section className="card" aria-labelledby="login-title">
        <p className="eyebrow">Todo Admin</p>
        <h1 id="login-title">Đăng nhập</h1>
        <p className="subtitle">
          Sử dụng tài khoản đã được tạo trong Supabase Authentication.
        </p>

        <LoginForm />
      </section>
    </main>
  );
}
