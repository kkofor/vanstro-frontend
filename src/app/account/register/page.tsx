import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a VanStro account for cart, favorites and checkout workflows."
};

export default function RegisterPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Create account</h1>
          <p>Registration is structured for the reserved `/auth/register` backend endpoint.</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <form className="form-panel form-grid two" action="/api/v1/auth/register" method="post">
            <div className="field">
              <label htmlFor="firstName">First name</label>
              <input id="firstName" name="firstName" autoComplete="given-name" required />
            </div>
            <div className="field">
              <label htmlFor="lastName">Last name</label>
              <input id="lastName" name="lastName" autoComplete="family-name" required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" required />
            </div>
            <button className="button button-primary" type="submit">
              Create account
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
