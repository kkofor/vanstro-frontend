"use client";

import Link from "next/link";
import { Bot, CheckCircle2, Headphones, MapPin, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { assetPath } from "@/lib/assets";
import {
  AI_SUPPORT_PROMPTS,
  SupportChannel,
  SupportMessage,
  createOpeningMessage,
  makeSupportMessage,
  resolveAiSupportReply
} from "@/lib/support/ai-support";

export function FloatingSupportWidget() {
  const widgetRef = useRef<HTMLElement>(null);
  const latestAssistantRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { cartCount, selectedDealerName } = useStorefront();
  const [open, setOpen] = useState(false);
  const [openedFromPage, setOpenedFromPage] = useState(false);
  const [status, setStatus] = useState("Ready to help");
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

  const openSupport = useCallback(
    (source: "widget" | "page" = "widget") => {
      setOpen(true);
      setOpenedFromPage(source === "page");
      setStatus("Ready to help");
      setMessages((current) =>
        current.length > 0 ? current : [createOpeningMessage(supportContext)]
      );
    },
    [supportContext]
  );

  const sendPrompt = useCallback(
    (prompt: string) => {
      const cleanPrompt = prompt.trim();
      if (!cleanPrompt) return;

      const userMessage = makeSupportMessage("user", cleanPrompt);
      const assistantMessage = resolveAiSupportReply(cleanPrompt, supportContext);

      setOpen(true);
      setStatus(assistantMessage.handoff ? "May need a teammate" : "Answer ready");
      setHandoffRequested(false);
      setMessages((current) => [
        ...(current.length > 0 ? current : [createOpeningMessage(supportContext)]),
        userMessage,
        assistantMessage
      ]);
      setDraft("");
    },
    [supportContext]
  );

  const requestHumanHandoff = () => {
    const handoffMessage = makeSupportMessage(
      "assistant",
      "I can route this to a VanStro support teammate. Please leave your name, email, order number if available, and the product or dealer location involved.",
      "Handoff prepared",
      {
        actions: [
          {
            label: "Open contact form",
            href: "/contact",
            description: "Use this for files, project details or email follow-up."
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
    setStatus("Handoff prepared");
    setMessages((current) => [...current, handoffMessage]);
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
          ...(current.length > 0 ? current : [createOpeningMessage(supportContext)]),
          makeSupportMessage(
            "assistant",
            "I will start here. If this needs a support teammate, I can prepare the handoff after collecting the key details.",
            "AI first"
          )
        ]);
      }
    };

    window.addEventListener("vanstro:support-request", handleSupportRequest);
    return () => window.removeEventListener("vanstro:support-request", handleSupportRequest);
  }, [openSupport, supportContext]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && widgetRef.current?.contains(target)) return;
      closeSupport();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeSupport();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
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
      aria-label="VanStro AI customer support"
    >
      {open ? (
        <div className="support-panel" role="dialog" aria-label="VanStro assistant">
          <div className="support-panel-head">
            <span>
              <Bot size={18} strokeWidth={2.2} />
            </span>
            <div>
              <strong>VanStro assistant</strong>
              <small>{status}</small>
            </div>
            <button type="button" aria-label="Close support panel" onClick={closeSupport}>
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>

          <div className="support-context-strip" aria-label="Support context">
            <span>
              <MapPin size={14} strokeWidth={2.2} />
              {supportContext.selectedDealerName}
            </span>
            <span>
              <CheckCircle2 size={14} strokeWidth={2.2} />
              AI first, human handoff when needed
            </span>
          </div>

          <div className="support-chat">
            <div className="support-messages" role="log" aria-live="polite">
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

            <div className="support-prompt-grid" aria-label="Suggested questions">
              {AI_SUPPORT_PROMPTS.map((item) => (
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
                  <strong>AI can prepare a teammate handoff</strong>
                  <em>It will pass the dealer, page context and conversation summary.</em>
                </span>
                <button type="button" onClick={requestHumanHandoff}>
                  Transfer with context
                </button>
              </div>
            ) : null}

            <form className="support-chat-form" onSubmit={handleSubmit}>
              <input
                aria-label="Ask VanStro assistant"
                autoComplete="off"
                value={draft}
                placeholder="Ask about products, pickup, orders..."
                onChange={(event) => setDraft(event.target.value)}
              />
              <button type="submit" aria-label="Send message" disabled={!draft.trim()}>
                <Send size={17} strokeWidth={2.3} />
              </button>
            </form>
            <p className="support-disclaimer">AI starts the conversation. A teammate can take over when needed.</p>
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
          alt="VanStro AI support"
          width={192}
          height={192}
          loading="eager"
          decoding="async"
        />
        <span>
          <strong>AI support</strong>
          <small>Ask VanStro</small>
        </span>
      </button>
    </aside>
  );
}
