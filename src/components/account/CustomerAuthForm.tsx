"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { vanstroApi } from "@/lib/api/api-client";

export function CustomerAuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSubmitting(true);
    try {
      if (isRegister) {
        await vanstroApi.register({
          firstName: String(form.get("firstName") ?? ""),
          lastName: String(form.get("lastName") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? "")
        });
      } else {
        await vanstroApi.login({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? "")
        });
      }
      router.push("/products");
      router.refresh();
    } catch {
      setError("We could not sign you in. Please check your details and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form className="form-panel form-grid two" onSubmit={submit}>
      {isRegister ? <>
        <div className="field"><label htmlFor="firstName">First name</label><input id="firstName" name="firstName" autoComplete="given-name" required /></div>
        <div className="field"><label htmlFor="lastName">Last name</label><input id="lastName" name="lastName" autoComplete="family-name" required /></div>
      </> : null}
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} required /></div>
      <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "Please wait..." : isRegister ? "Create account" : "Sign in"}</button>
      <Link className="section-link" href={isRegister ? "/account/login" : "/account/register"}>{isRegister ? "Already have an account? Sign in" : "Create an account"}</Link>
      {error ? <p className="quantity-limit-note" aria-live="polite">{error}</p> : null}
    </form>
  );
}
