"use client";

import { Bot, Headphones, MessageCircle, Send, X } from "lucide-react";
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
  const [channel, setChannel] = useState<SupportChannel>("ai");
  const [status, setStatus] = useState("Ready to connect");
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

  const closeSupport = useCallback(() => {
    setOpen(false);
    setOpenedFromPage(false);
  }, []);

  const openSupport = useCallback(
    (nextChannel: SupportChannel, source: "widget" | "page" = "widget") => {
      setChannel(nextChannel);
      setOpen(true);
      setOpenedFromPage(source === "page");
      setStatus(nextChannel === "live" ? "Live support handoff ready" : "AI assistant ready");
      setMessages((current) =>
        current.length > 0 ? current : [createOpeningMessage(supportContext)]
      );
    },
    [supportContext]
  );

  const requestSupport = (nextChannel: SupportChannel) => {
    window.dispatchEvent(
      new CustomEvent("vanstro:support-request", {
        detail: { channel: nextChannel, source: "widget" }
      })
    );
    openSupport(nextChannel);
  };

  const sendPrompt = useCallback(
    (prompt: string) => {
      const cleanPrompt = prompt.trim();
      if (!cleanPrompt) return;

      const userMessage = makeSupportMessage("user", cleanPrompt);
      const assistantMessage = resolveAiSupportReply(cleanPrompt, supportContext);

      setChannel("ai");
      setOpen(true);
      setStatus("AI assistant responded");
      setMessages((current) => [
        ...(current.length > 0 ? current : [createOpeningMessage(supportContext)]),
        userMessage,
        assistantMessage
      ]);
      setDraft("");
    },
    [supportContext]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendPrompt(draft);
  };

  useEffect(() => {
    const handleSupportRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ channel?: SupportChannel; source?: string }>).detail;
      const requestedChannel = detail?.channel;
      if (detail?.source === "widget") return;
      if (requestedChannel === "ai" || requestedChannel === "live") {
        openSupport(requestedChannel, "page");
      }
    };

    window.addEventListener("vanstro:support-request", handleSupportRequest);
    return () => window.removeEventListener("vanstro:support-request", handleSupportRequest);
  }, [openSupport]);

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
    if (open && channel === "ai") {
      messageEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [channel, messages, open]);

  return (
    <aside
      className={openedFromPage ? "support-widget is-page-open" : "support-widget"}
      ref={widgetRef}
      aria-label="Online customer support"
    >
      {open ? (
        <div className="support-panel" role="dialog" aria-label="Support options">
          <div className="support-panel-head">
            <span>
              {channel === "ai" ? (
                <Bot size={18} strokeWidth={2.2} />
              ) : (
                <MessageCircle size={18} strokeWidth={2.2} />
              )}
            </span>
            <div>
              <strong>{channel === "ai" ? "VanStro assistant" : "VanStro support"}</strong>
              <small>{status}</small>
            </div>
            <button type="button" aria-label="Close support panel" onClick={closeSupport}>
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>

          <div className="support-channel-row" aria-label="Support channel">
            <button
              className={channel === "ai" ? "support-channel-tab active" : "support-channel-tab"}
              type="button"
              onClick={() => requestSupport("ai")}
            >
              <Bot size={16} strokeWidth={2.2} />
              AI assistant
            </button>
            <button
              className={channel === "live" ? "support-channel-tab active" : "support-channel-tab"}
              type="button"
              onClick={() => requestSupport("live")}
            >
              <Headphones size={16} strokeWidth={2.2} />
              Online support
            </button>
          </div>

          {channel === "ai" ? (
            <div className="support-chat" data-support-channel-panel="ai">
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
              <p className="support-disclaimer">
                Dealer and support teams confirm order-specific details.
              </p>
            </div>
          ) : (
            <div className="support-live-card" data-support-channel-panel="live">
              <Headphones size={22} strokeWidth={2.2} />
              <div>
                <strong>Live handoff queue</strong>
                <p>
                  Share product names, SKU, dealer location or order number. A VanStro
                  support flow can connect here when the service is wired.
                </p>
                <div className="support-live-actions">
                  <a href="/contact">Contact support</a>
                  <button type="button" onClick={() => sendPrompt("I need help with an order.")}>
                    Ask AI first
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <button
        className="support-launcher"
        type="button"
        aria-expanded={open}
        onClick={() => openSupport(channel)}
      >
        <img src={assetPath("/assets/generated/support-agent-v1.png")} alt="VanStro online support" />
        <span>
          <strong>Online support</strong>
          <small>Chat & AI ready</small>
        </span>
      </button>
    </aside>
  );
}
