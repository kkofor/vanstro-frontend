import type { Metadata } from "next";
import { CustomerAuthForm } from "@/components/account/CustomerAuthForm";

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
