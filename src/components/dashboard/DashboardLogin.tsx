"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { DASHBOARD_API_BASE_URL } from "@/lib/dashboard/api";
import {
  classifyLoginSubmit,
  classifySessionRestore,
  dashboardAuthMachine,
  dashboardDefaultHref,
  dashboardLoginHref,
  dashboardLoginRequest,
  dashboardLogout,
  dashboardReturnToFromLoginQuery,
  dashboardReturnToTarget,
  dashboardSessionRequest,
  isAbortError,
  type DashboardAuthPhase,
  type DashboardHttpResult
} from "@/lib/dashboard/auth-session";
import { dispatchDashboardSessionChanged } from "@/lib/dashboard/session-event";
import type { SiteLocale } from "@/lib/i18n/locale";
import { useDashboardFoundation } from "./DashboardFoundationContext";
import styles from "./DashboardLogin.module.css";

export type DashboardLoginNotice = "expired" | null;
type Message = { tone: "error" | "status"; text: string } | null;

const COPY = {
  skip: "跳至主要内容",
  backToStore: "返回商店",
  title: "VanStro 管理后台",
  subtitle: "登录以管理目录、定价与运营数据。",
  emailLabel: "邮箱",
  passwordLabel: "密码",
  submit: "登录",
  submitting: "登录中…",
  forgotPassword: "忘记密码？",
  restoring: "正在验证会话…",
  entering: "正在进入管理后台…",
  loggingOut: "正在退出…",
  expired: "会话已过期，请重新登录。",
  invalidCredentials: "邮箱或密码不正确。",
  loginUnavailable: "无法连接登录服务，请检查网络后重试。",
  sessionUnavailable: "无法建立安全会话，请重试。",
  invalidResponse: "服务器响应异常，请重试。",
  retry: "重试",
  unavailableTitle: "登录服务暂时不可用",
  unavailableBody: "无法连接身份服务。请检查网络后重试。",
  invalidTitle: "无法安全登录",
  invalidBody: "服务器响应未通过安全验证。请重试或联系管理员。",
  forbiddenTitle: "没有后台访问权限",
  forbiddenBody: "当前账户无权访问管理后台。若您认为这是错误的，请联系管理员。",
  switchAccount: "退出并切换账户"
} as const;

function LoginState({ title, body, retry }: { title: string; body: string; retry?: () => void }) {
  return (
    <main className={styles.main} id="main-content" tabIndex={-1}>
      <div className={styles.stateCard}>
        <h1>{title}</h1>
        <p>{body}</p>
        {retry ? <button className={styles.retry} onClick={retry} type="button">{COPY.retry}</button> : null}
        <Link className={styles.backLink} href="/">{COPY.backToStore}</Link>
      </div>
    </main>
  );
}

function DashboardLoginForm({ locale, notice }: { locale: SiteLocale; notice: DashboardLoginNotice }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const foundation = useDashboardFoundation();
  const [phase, setPhase] = useState<DashboardAuthPhase>("restoring");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<Message>(null);
  const [loggedOutOfForbidden, setLoggedOutOfForbidden] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const lastFailureRef = useRef<"login" | "restore">("restore");
  // True only after a verified login dispatched the authenticated session
  // event and the boundary is re-checking the session; distinguishes the
  // "login in flight" phase (foundation still anonymous is normal) from a
  // post-dispatch 401 (the cookie was not accepted by the foundation).
  const sessionAcceptedRef = useRef(false);

  // Post-login navigation target, resolved through both returnTo layers
  // (Suspense-safe: this form renders inside the DashboardLoginPage Suspense
  // boundary, so useSearchParams never suspends here):
  // 1. input safety — safeDashboardReturnTo inside dashboardReturnToTarget;
  // 2. Authority attribution — adjudicateDashboardReturnTo through the shared
  //    V11-1 runtime selector resolver, preferring the live Foundation
  //    projection modules when available and falling back to the mechanical
  //    registry while anonymous.
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  const returnTo = useMemo(() => {
    const modules = foundation?.foundation?.modules;
    if (normalizedPathname === dashboardLoginHref(locale)) {
      // The login page's own query is never a return target; only the
      // explicit decoded returnTo value is. Sensitive/external/unknown/
      // self-loop values fall back to the locale Overview.
      return dashboardReturnToTarget(dashboardReturnToFromLoginQuery(searchParams.toString()), locale, modules);
    }
    // Anonymous business-route visits render the login in place; the current
    // URL is the preserved return target once both layers accept it.
    const search = searchParams.toString();
    const current = `${pathname}${search ? `?${search}` : ""}`;
    return dashboardReturnToTarget(current, locale, modules);
  }, [normalizedPathname, pathname, searchParams, locale, foundation]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  // Foundation status → session machine transitions. Only the phases that
  // legitimately own an event accept it; stale events fail closed inside
  // dashboardAuthMachine.
  useEffect(() => {
    switch (foundation.status) {
      case "idle":
      case "loading":
        setPhase((current) => dashboardAuthMachine(current, { type: "RESTORE_START" }));
        break;
      case "ready":
        setPhase((current) => current === "authenticating"
          ? dashboardAuthMachine(current, { type: "SESSION_ESTABLISHED" })
          : dashboardAuthMachine(current, { type: "RESTORE_AUTHENTICATED" }));
        break;
      case "anonymous":
        if (phase === "authenticating" && sessionAcceptedRef.current) {
          // Login was accepted and dispatched, but the foundation cannot see
          // the session — surface a retryable failure instead of a
          // credentials error.
          sessionAcceptedRef.current = false;
          setMessage({ tone: "error", text: COPY.sessionUnavailable });
          setPhase((current) => dashboardAuthMachine(current, { type: "LOGIN_UNAVAILABLE" }));
        } else {
          setPhase((current) => dashboardAuthMachine(current, { type: "RESTORE_ANONYMOUS" }));
        }
        break;
      case "forbidden":
        setPhase((current) => dashboardAuthMachine(current, { type: "RESTORE_FORBIDDEN" }));
        break;
      case "unavailable":
        lastFailureRef.current = "restore";
        setPhase((current) => dashboardAuthMachine(current, { type: "RESTORE_UNAVAILABLE" }));
        break;
      case "invalid":
        lastFailureRef.current = "restore";
        setPhase((current) => dashboardAuthMachine(current, { type: "RESTORE_INVALID" }));
        break;
      case "legacy":
        // Shell disabled: the legacy DashboardShell owns the session flow.
        // authenticating covers the post-login boundary reload landing on a
        // disabled shell — navigate safely instead of staying stuck.
        if (phase === "restoring" || phase === "anonymous" || phase === "expired" || phase === "authenticating") {
          router.replace(dashboardDefaultHref(locale));
        }
        break;
    }
    // phase is intentionally a dependency: the anonymous branch must know
    // whether a login is in flight.
  }, [foundation.status, phase, locale, router]);

  // A freshly mounted login on an already-anonymous foundation is a normal
  // visit; the expired notice is passed by the shell when it observed an
  // authenticated → anonymous transition. The notice may arrive after the
  // form already resolved to the anonymous phase (the shell captures the
  // transition in an effect), so it applies once in either phase and never
  // re-applies over later credentials errors.
  const noticeAppliedRef = useRef(false);
  useEffect(() => {
    if (notice !== "expired") {
      noticeAppliedRef.current = false;
      return;
    }
    if (noticeAppliedRef.current) return;
    if (phase === "restoring" || phase === "anonymous") {
      noticeAppliedRef.current = true;
      setPhase((current) => dashboardAuthMachine(current, { type: "RESTORE_ANONYMOUS" }));
      setMessage({ tone: "status", text: COPY.expired });
    }
  }, [notice, phase]);

  // Only navigate after the session is authenticated AND the Foundation
  // boundary has re-verified foundation + authorization for the same actor.
  useEffect(() => {
    if (phase === "authenticated") router.replace(returnTo);
  }, [phase, returnTo, router]);

  const submitLogin = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    // Fencing: only the anonymous phase (or a retried login failure) may
    // start a login; a second submit while authenticating is ignored.
    if (phase !== "anonymous" && phase !== "unavailable" && phase !== "invalid-response") return;
    lastFailureRef.current = "login";
    // A fresh attempt is pre-dispatch by definition: clear the marker so a
    // stale boundary state can never masquerade as a post-dispatch 401.
    sessionAcceptedRef.current = false;
    setMessage(null);
    setPhase((current) => dashboardAuthMachine(current, { type: "LOGIN_START" }));
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;

    let login: DashboardHttpResult;
    try {
      login = await dashboardLoginRequest(DASHBOARD_API_BASE_URL, email, password, controller.signal);
    } catch (error) {
      // Unmount abort: drop silently — no state updates, no rejection.
      if (isAbortError(error)) return;
      throw error;
    }
    const outcome = classifyLoginSubmit(login.status);
    if (outcome === "invalid-credentials") {
      // Enumeration-safe: one message for every failed credential.
      setMessage({ tone: "error", text: COPY.invalidCredentials });
      setPhase((current) => dashboardAuthMachine(current, { type: "LOGIN_INVALID" }));
      emailRef.current?.focus();
      return;
    }
    if (outcome === "unavailable") {
      setMessage({ tone: "error", text: COPY.loginUnavailable });
      setPhase((current) => dashboardAuthMachine(current, { type: "LOGIN_UNAVAILABLE" }));
      return;
    }
    // Login accepted. The cookie alone grants nothing: re-verify the session
    // through /auth/me (strict DTO) before any navigation or business mount.
    let session: DashboardHttpResult;
    try {
      session = await dashboardSessionRequest(DASHBOARD_API_BASE_URL, controller.signal);
    } catch (error) {
      if (isAbortError(error)) return;
      throw error;
    }
    const restore = classifySessionRestore(session.status, session.payload);
    if (restore.phase === "invalid-response") {
      setMessage({ tone: "error", text: COPY.invalidResponse });
      setPhase((current) => dashboardAuthMachine(current, { type: "LOGIN_INVALID_RESPONSE" }));
      return;
    }
    if (restore.phase === "forbidden") {
      // Customer / non-admin / disabled / no dashboard.access: never mount
      // the business shell, never dispatch authenticated.
      setPhase((current) => dashboardAuthMachine(current, { type: "LOGIN_FORBIDDEN" }));
      return;
    }
    if (restore.phase !== "authenticated") {
      setMessage({ tone: "error", text: COPY.sessionUnavailable });
      setPhase((current) => dashboardAuthMachine(current, { type: "LOGIN_UNAVAILABLE" }));
      return;
    }
    // Session verified: the Foundation boundary reloads foundation +
    // authorization for the new cookie; navigation happens only when both
    // are ready and the actor identity matches.
    sessionAcceptedRef.current = true;
    dispatchDashboardSessionChanged("authenticated");
  }, [phase, email, password]);

  const retry = useCallback(() => {
    if (lastFailureRef.current === "login") {
      void submitLogin();
    } else {
      foundation.retry();
      setPhase((current) => dashboardAuthMachine(current, { type: "RESTORE_START" }));
    }
  }, [foundation, submitLogin]);

  async function switchAccount() {
    if (loggedOutOfForbidden) return;
    setLoggedOutOfForbidden(true);
    await dashboardLogout(DASHBOARD_API_BASE_URL);
    dispatchDashboardSessionChanged("anonymous");
    setLoggedOutOfForbidden(false);
    setPhase((current) => dashboardAuthMachine(current, { type: "LOGOUT_DONE" }));
    setPassword("");
    setEmail("");
  }

  if (phase === "restoring") {
    return (
      <main aria-busy="true" className={styles.main} id="main-content" tabIndex={-1}>
        <div aria-live="polite" className={styles.stateCard} role="status">
          <h1>{COPY.title}</h1>
          <p>{COPY.restoring}</p>
        </div>
      </main>
    );
  }

  if (phase === "authenticated") {
    return (
      <main aria-busy="true" className={styles.main} id="main-content" tabIndex={-1}>
        <div aria-live="polite" className={styles.stateCard} role="status">
          <h1>{COPY.title}</h1>
          <p>{COPY.entering}</p>
        </div>
      </main>
    );
  }

  if (phase === "logging-out") {
    return (
      <main aria-busy="true" className={styles.main} id="main-content" tabIndex={-1}>
        <div aria-live="polite" className={styles.stateCard} role="status">
          <h1>{COPY.title}</h1>
          <p>{COPY.loggingOut}</p>
        </div>
      </main>
    );
  }

  if (phase === "unavailable") {
    return <LoginState body={COPY.unavailableBody} retry={retry} title={COPY.unavailableTitle} />;
  }

  if (phase === "invalid-response") {
    return <LoginState body={COPY.invalidBody} retry={retry} title={COPY.invalidTitle} />;
  }

  if (phase === "forbidden") {
    return (
      <main className={styles.main} id="main-content" tabIndex={-1}>
        <div className={styles.stateCard} role="alert">
          <h1>{COPY.forbiddenTitle}</h1>
          <p>{COPY.forbiddenBody}</p>
          <button className={styles.retry} disabled={loggedOutOfForbidden} onClick={() => void switchAccount()} type="button">
            {loggedOutOfForbidden ? COPY.loggingOut : COPY.switchAccount}
          </button>
          <Link className={styles.backLink} href="/">{COPY.backToStore}</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main} id="main-content" tabIndex={-1}>
      <div className={styles.loginCard}>
        <h1>{COPY.title}</h1>
        <p className={styles.subtitle}>{COPY.subtitle}</p>
        <form className={styles.form} onSubmit={(event) => void submitLogin(event)}>
          <div className={styles.field}>
            <label htmlFor="dashboard-login-email">{COPY.emailLabel}</label>
            <input
              aria-describedby="dashboard-login-error dashboard-login-status"
              autoComplete="email"
              autoFocus
              id="dashboard-login-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              ref={emailRef}
              required
              type="email"
              value={email}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="dashboard-login-password">{COPY.passwordLabel}</label>
            <input
              aria-describedby="dashboard-login-error dashboard-login-status"
              autoComplete="current-password"
              id="dashboard-login-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          {message?.tone === "error" ? (
            <p className={styles.error} id="dashboard-login-error" role="alert">{message.text}</p>
          ) : null}
          {message?.tone === "status" ? (
            <p className={styles.status} id="dashboard-login-status" role="status">{message.text}</p>
          ) : (
            <p className={styles.status} id="dashboard-login-status" role="status" />
          )}
          <button className={styles.submit} disabled={phase === "authenticating"} type="submit">
            {phase === "authenticating" ? COPY.submitting : COPY.submit}
          </button>
        </form>
        <p className={styles.help}>
          <Link href={locale === "fr-CA" ? "/fr/account/forgot-password" : "/account/forgot-password"}>{COPY.forgotPassword}</Link>
          <Link href="/">{COPY.backToStore}</Link>
        </p>
      </div>
    </main>
  );
}

export function DashboardLoginPage({ locale, notice = null }: { locale: SiteLocale; notice?: DashboardLoginNotice }) {
  return (
    <div className={styles.shell} lang="zh-CN">
      <a className={styles.skipLink} href="#main-content">{COPY.skip}</a>
      <Suspense fallback={<div aria-busy="true" className={styles.main} id="main-content" tabIndex={-1}><div className={styles.stateCard}><h1>{COPY.title}</h1><p>{COPY.restoring}</p></div></div>}>
        <DashboardLoginForm locale={locale} notice={notice} />
      </Suspense>
    </div>
  );
}
