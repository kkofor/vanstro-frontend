import type { Metadata } from "next";
import { CustomerAuthForm } from "@/components/account/CustomerAuthForm";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Sign in",
  "Sign in to your VanStro customer or dealer account.",
  "/account/login"
);

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
