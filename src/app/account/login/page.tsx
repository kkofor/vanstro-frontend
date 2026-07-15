import type { Metadata } from "next";
import { CustomerAuthForm } from "@/components/account/CustomerAuthForm";

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
          <p>Sign in to access saved orders and account details.</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <CustomerAuthForm mode="login" />
        </div>
      </section>
    </>
  );
}
