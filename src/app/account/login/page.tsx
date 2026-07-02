import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your VanStro customer or dealer account."
};

export default function LoginPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Sign in</h1>
          <p>Account forms are ready for the reserved authentication API.</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <form className="form-panel form-grid" action="/api/v1/auth/login" method="post">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <button className="button button-primary" type="submit">
              Sign in
            </button>
            <Link className="section-link" href="/account/register">
              Create an account
            </Link>
          </form>
        </div>
      </section>
    </>
  );
}
