import type { Metadata } from "next";
import { CustomerAuthForm } from "@/components/account/CustomerAuthForm";
import { buildPrivateMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPrivateMetadata(
  "Create account",
  "Create a VanStro account for cart, favorites and checkout workflows.",
  "/account/register"
);

export default function RegisterPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Create account</h1>
          <p>Create an account for saved addresses, orders and favorites.</p>
        </div>
      </section>
      <section className="page-panel">
        <div className="container">
          <CustomerAuthForm mode="register" />
        </div>
      </section>
    </>
  );
}
