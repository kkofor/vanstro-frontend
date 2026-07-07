"use client";

import { Bot, Headphones, Send, X } from "lucide-react";
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
  const messageEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { cartCount, selectedDealerName } = useStorefront();
  const [open, setOpen] = useState(false);
  const [openedFromPage, setOpenedFromPage] = useState(false);
  const [status, setStatus] = useState("AI assistant ready");
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

  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const showHandoffPrompt = Boolean(latestAssistantMessage?.handoff && !handoffRequested);

  const closeSupport = useCallback(() => {
    setOpen(false);
    setOpenedFromPage(false);
  }, []);

  const openSupport = useCallback(
    (source: "widget" | "page" = "widget") => {
      setOpen(true);
      setOpenedFromPage(source === "page");
      setStatus("AI assistant ready");
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
      setStatus(assistantMessage.handoff ? "AI can prepare a handoff" : "AI assistant responded");
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
      "Human handoff prepared"
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
    setStatus("Human handoff prepared");
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
      messageEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages, open]);

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

          <div className="support-chat">
            <div className="support-messages" role="log" aria-live="polite">
              {messages.map((message) => (
                <div className={`support-message ${message.role}`} key={message.id}>
                  <div className="support-message-bubble">
                    <p>{message.text}</p>
                    {message.meta ? <small>{message.meta}</small> : null}
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
                <span>Need a person for this case?</span>
                <button type="button" onClick={requestHumanHandoff}>
                  Request human support
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
        <img src={assetPath("/assets/generated/support-agent-v1.png")} alt="VanStro AI support" />
        <span>
          <strong>AI support</strong>
          <small>Ask VanStro</small>
        </span>
      </button>
    </aside>
  );
}
