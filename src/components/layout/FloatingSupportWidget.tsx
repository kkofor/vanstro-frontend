"use client";

import Link from "next/link";
import { Bot, CheckCircle2, Headphones, MapPin, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { vanstroApi } from "@/lib/api/api-client";
import { localeHref } from "@/lib/i18n/routes";
import { assetPath } from "@/lib/assets";
import { useModalFocus } from "@/lib/accessibility/useModalFocus";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  SupportChannel,
  getAiSupportPrompts,
  SupportMessage,
  createOpeningMessage,
  makeSupportMessage,
  resolveAiSupportReply
} from "@/lib/support/ai-support";

export function FloatingSupportWidget() {
  const { copy, locale } = useLocale();
  const supportCopy = copy.supportWidget;
  const prompts = getAiSupportPrompts(locale);
  const widgetRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const latestAssistantRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { cartCount, selectedDealerName, selectedDealerId } = useStorefront();
  const [open, setOpen] = useState(false);
  const [openedFromPage, setOpenedFromPage] = useState(false);
  const [status, setStatus] = useState(supportCopy.ready);
  const [handoffRequested, setHandoffRequested] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState("");

  const supportContext = useMemo(
    () => ({
      pathname,
      selectedDealerName,
      cartCount
    }),
    [cartCount, pathname, selectedDealerName]
  );

  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant"),
    [messages]
  );
  const showHandoffPrompt = Boolean(latestAssistantMessage?.handoff && !handoffRequested);

  const closeSupport = useCallback(() => {
    setOpen(false);
    setOpenedFromPage(false);
  }, []);

  useModalFocus({
    active: open,
    containerRef: panelRef,
    modalRootRef: widgetRef,
    onEscape: closeSupport
  });

  const openSupport = useCallback(
    (source: "widget" | "page" = "widget") => {
      setOpen(true);
      setOpenedFromPage(source === "page");
      setStatus(supportCopy.ready);
      setMessages((current) =>
        current.length > 0 ? current : [createOpeningMessage(supportContext, locale)]
      );
    },
    [locale, supportContext, supportCopy.ready]
  );

  const sendPrompt = useCallback(
    (prompt: string) => {
      const cleanPrompt = prompt.trim();
      if (!cleanPrompt) return;

      const userMessage = makeSupportMessage("user", cleanPrompt);
      const assistantMessage = resolveAiSupportReply(cleanPrompt, supportContext, locale);

      setOpen(true);
      setStatus(assistantMessage.handoff ? supportCopy.mayNeedTeammate : supportCopy.answerReady);
      setHandoffRequested(false);
      setMessages((current) => [
        ...(current.length > 0 ? current : [createOpeningMessage(supportContext, locale)]),
        userMessage,
        assistantMessage
      ]);
      setDraft("");
    },
    [locale, supportContext, supportCopy.answerReady, supportCopy.mayNeedTeammate]
  );

  const [handoffSubmitting, setHandoffSubmitting] = useState(false);

  const requestHumanHandoff = async () => {
    if (handoffSubmitting) return;

    setHandoffSubmitting(true);
    setStatus(supportCopy.handoffPrepared);

    try {
      const transcript = messages.map((message) => ({
        role: message.role,
        message: message.text,
        createdAt: new Date().toISOString()
      }));

      await vanstroApi.requestSupportHandoff({
        channel: "human",
        sourcePath: pathname,
        dealerId: selectedDealerId,
        transcript:
          transcript.length > 0
            ? transcript
            : [
                {
                  role: "user" as const,
                  message: supportCopy.handoffTitle,
                  createdAt: new Date().toISOString()
                }
              ]
      });

      const handoffMessage = makeSupportMessage(
        "assistant",
        supportCopy.handoffMessage,
        supportCopy.handoffPrepared,
        {
          actions: [
            {
              label: supportCopy.handoffContactLabel,
              href: localeHref("/contact", locale),
              description: supportCopy.handoffContactDescription
            }
          ]
        }
      );

      window.dispatchEvent(
        new CustomEvent("vanstro:human-support-request", {
          detail: {
            context: supportContext,
            messages
          }
        })
      );

      setHandoffRequested(true);
      setMessages((current) => [...current, handoffMessage]);
    } catch {
      setStatus(supportCopy.mayNeedTeammate);
      setHandoffRequested(false);
    } finally {
      setHandoffSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendPrompt(draft);
  };

  useEffect(() => {
    const handleSupportRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ channel?: SupportChannel; source?: string }>).detail;
      if (detail?.source === "widget") return;
      openSupport("page");

      if (detail?.channel === "live") {
        setMessages((current) => [
          ...(current.length > 0 ? current : [createOpeningMessage(supportContext, locale)]),
          makeSupportMessage(
            "assistant",
            supportCopy.liveIntro,
            supportCopy.liveIntroMeta
          )
        ]);
      }
    };

    window.addEventListener("vanstro:support-request", handleSupportRequest);
    return () => window.removeEventListener("vanstro:support-request", handleSupportRequest);
  }, [locale, openSupport, supportContext, supportCopy.liveIntro, supportCopy.liveIntroMeta]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && widgetRef.current?.contains(target)) return;
      closeSupport();
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [closeSupport, open]);

  useEffect(() => {
    if (open) {
      if (latestAssistantRef.current) {
        latestAssistantRef.current.scrollIntoView({ block: "start" });
        return;
      }

      messageEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [latestAssistantMessage?.id, open]);

  return (
    <aside
      className={openedFromPage ? "support-widget is-page-open" : "support-widget"}
      ref={widgetRef}
      aria-label={supportCopy.customerSupportLabel}
    >
      {open ? (
        <div
          ref={panelRef}
          className="support-panel"
          role="dialog"
          aria-modal="true"
          aria-label={supportCopy.assistantLabel}
          tabIndex={-1}
        >
          <div className="support-panel-head">
            <span>
              <Bot size={18} strokeWidth={2.2} />
            </span>
            <div>
              <strong>{supportCopy.assistantLabel}</strong>
              <small aria-live="polite" aria-atomic="true">{status}</small>
            </div>
            <button type="button" aria-label={supportCopy.closeLabel} onClick={closeSupport}>
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>

          <div className="support-context-strip" aria-label={supportCopy.contextLabel}>
            <span>
              <MapPin size={14} strokeWidth={2.2} />
              {supportContext.selectedDealerName}
            </span>
            <span>
              <CheckCircle2 size={14} strokeWidth={2.2} />
              {supportCopy.aiFirst}
            </span>
          </div>

          <div className="support-chat">
            <div
              className="support-messages"
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {messages.map((message) => (
                <div
                  className={`support-message ${message.role}`}
                  key={message.id}
                  ref={message.id === latestAssistantMessage?.id ? latestAssistantRef : undefined}
                >
                  <div className="support-message-bubble">
                    <p>{message.text}</p>
                    {message.meta ? <small>{message.meta}</small> : null}
                    {message.actions?.length ? (
                      <div className="support-message-actions">
                        {message.actions.map((action) => (
                          <Link
                            className={action.tone === "primary" ? "support-action-link primary" : "support-action-link"}
                            href={action.href}
                            key={`${message.id}-${action.href}-${action.label}`}
                            onClick={closeSupport}
                          >
                            <strong>{action.label}</strong>
                            {action.description ? <span>{action.description}</span> : null}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              <div ref={messageEndRef} />
            </div>

            <div className="support-prompt-grid" aria-label={supportCopy.suggestedQuestionsLabel}>
              {prompts.map((item) => (
                <button
                  data-ai-support-intent={item.id}
                  key={item.id}
                  type="button"
                  onClick={() => sendPrompt(item.prompt)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {showHandoffPrompt ? (
              <div className="support-handoff-prompt" role="status">
                <Headphones size={18} strokeWidth={2.2} />
                <span>
                  <strong>{supportCopy.handoffTitle}</strong>
                  <em>{supportCopy.handoffDescription}</em>
                </span>
                <button type="button" onClick={() => void requestHumanHandoff()} disabled={handoffSubmitting}>
                  {supportCopy.handoffAction}
                </button>
              </div>
            ) : null}

            <form className="support-chat-form" onSubmit={handleSubmit}>
              <input
                aria-label={supportCopy.inputLabel}
                autoComplete="off"
                value={draft}
                placeholder={supportCopy.inputPlaceholder}
                onChange={(event) => setDraft(event.target.value)}
              />
              <button type="submit" aria-label={supportCopy.sendLabel} disabled={!draft.trim()}>
                <Send size={17} strokeWidth={2.3} />
              </button>
            </form>
            <p className="support-disclaimer">{supportCopy.disclaimer}</p>
          </div>
        </div>
      ) : null}

      <button
        className="support-launcher"
        type="button"
        aria-expanded={open}
        onClick={() => openSupport()}
      >
        <img
          src={assetPath("/assets/generated/support-agent-v1-192.webp")}
          alt={supportCopy.imageAlt}
          width={192}
          height={192}
          loading="eager"
          decoding="async"
        />
        <span>
          <strong>{supportCopy.launcherTitle}</strong>
          <small>{supportCopy.launcherSubtitle}</small>
        </span>
      </button>
    </aside>
  );
}
