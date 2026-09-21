"use client";

import Link from "next/link";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { Message, MessageContent } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Headphones, MapPin, MessageCircle, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { vanstroApi } from "@/lib/api/api-client";
import { localeHref } from "@/lib/i18n/routes";
import { isCanonicalCatalogHref, openCanonicalCatalog } from "@/lib/i18n/canonical-catalog";
import { useModalFocus } from "@/lib/accessibility/useModalFocus";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  SupportChannel,
  getAiSupportPrompts,
  SupportMessage,
  createOpeningMessage,
  makeSupportMessage,
  resolveAiSupportApiReply
} from "@/lib/support/ai-support";

export function FloatingSupportWidget() {
  const { copy, locale } = useLocale();
  const supportCopy = copy.supportWidget;
  const prompts = getAiSupportPrompts(locale);
  const widgetRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { cartCount, selectedDealerName, selectedDealerId } = useStorefront();
  const [open, setOpen] = useState(false);
  const [openedFromPage, setOpenedFromPage] = useState(false);
  const [status, setStatus] = useState(supportCopy.ready);
  const [handoffRequested, setHandoffRequested] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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
    async (prompt: string) => {
      const cleanPrompt = prompt.trim();
      if (!cleanPrompt) return;

      const userMessage = makeSupportMessage("user", cleanPrompt);
      const openingMessage = createOpeningMessage(supportContext, locale);
      const currentMessages = messages.length > 0 ? messages : [openingMessage];

      setOpen(true);
      setHandoffRequested(false);
      setIsGenerating(true);
      setDraft("");
      setMessages((current) => [
        ...(current.length > 0 ? current : [openingMessage]),
        userMessage
      ]);
      setStatus(supportCopy.ready);

      let assistantMessage: SupportMessage | undefined;
      try {
        const response = await vanstroApi.supportAiChat({
          message: cleanPrompt,
          locale,
          pathname: supportContext.pathname,
          selectedDealerName: supportContext.selectedDealerName,
          cartCount: supportContext.cartCount
        });
        assistantMessage = resolveAiSupportApiReply(response.data, locale);
      } catch {
        // The API failure is rendered explicitly below; never imitate an AI reply locally.
      }

      const unavailableMessage = makeSupportMessage(
        "assistant",
        supportCopy.cannotConnectAssistant,
        supportCopy.cannotConnectAssistantMeta,
        {
          handoff: true,
          actions: [
            {
              label: supportCopy.replies.contactPage,
              href: localeHref("/contact", locale),
              description: supportCopy.replies.contactDescription,
              tone: "primary"
            }
          ]
        }
      );
      assistantMessage ??= unavailableMessage;
      setIsGenerating(false);
      setStatus(assistantMessage.handoff ? supportCopy.mayNeedTeammate : supportCopy.answerReady);
      setMessages((current) => [
        ...(current.length > 0 ? current : currentMessages),
        assistantMessage
      ]);
    },
    [locale, messages, supportContext, supportCopy.answerReady, supportCopy.mayNeedTeammate, supportCopy.ready]
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
    if (!draft.trim()) return;
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

  return (
    <aside
      className={openedFromPage ? "support-root is-page-open" : "support-root"}
      ref={widgetRef}
      aria-label={supportCopy.customerSupportLabel}
    >
      {open ? (
        <div
          ref={panelRef}
          className="support-card"
          role="dialog"
          aria-modal="true"
          aria-label={supportCopy.assistantLabel}
          tabIndex={-1}
        >
          <div className="support-accent" aria-hidden="true" />
          <header className="support-card-header">
            <span className="support-avatar" aria-hidden="true">
              <MessageCircle size={20} strokeWidth={1.7} />
            </span>
            <div className="support-head-copy">
              <strong>{supportCopy.assistantLabel}</strong>
              <span><i className="support-live-dot" />{supportCopy.ready}</span>
            </div>
            <Button className="support-close" type="button" variant="ghost" size="icon" aria-label={supportCopy.closeLabel} onClick={closeSupport}>
              <X size={15} strokeWidth={1.7} />
            </Button>
          </header>

          <Marker className="support-dealer-marker" aria-label={supportCopy.contextLabel}>
            <MapPin size={14} strokeWidth={2.2} aria-hidden="true" />
            <MarkerContent>{supportContext.selectedDealerName}</MarkerContent>
          </Marker>

          <section className="support-chat">
            <MessageScrollerProvider autoScroll defaultScrollPosition="end">
              <MessageScroller className="support-messages">
                <MessageScrollerViewport aria-label={supportCopy.assistantLabel} role="log" aria-live="polite" aria-relevant="additions text">
                  <MessageScrollerContent>
                    {messages.map((message) => (
                      <MessageScrollerItem className="support-message-item" key={message.id} messageId={message.id} scrollAnchor={message.id === latestAssistantMessage?.id}>
                        <Message align={message.role === "user" ? "end" : "start"} className={`support-message ${message.role}`}>
                          <MessageContent>
                            <Bubble align={message.role === "user" ? "end" : "start"} variant={message.role === "user" ? "default" : "muted"}>
                              <BubbleContent className="support-bubble-content">
                                <p>{message.text}</p>
                                {message.meta ? <small>{message.meta}</small> : null}
                                {message.actions?.length ? (
                                  <div className="support-message-actions">
                                    {message.actions.map((action) => (
                                      <Link
                                        className={action.tone === "primary" ? "support-action-link primary" : "support-action-link"}
                                        href={action.href}
                                        key={`${message.id}-${action.href}-${action.label}`}
                                        onClick={(event) => {
                                          closeSupport();
                                          if (isCanonicalCatalogHref(action.href)) {
                                            event.preventDefault();
                                            openCanonicalCatalog(locale);
                                          }
                                        }}
                                      >
                                        <strong>{action.label}</strong>
                                        {action.description ? <span>{action.description}</span> : null}
                                      </Link>
                                    ))}
                                  </div>
                                ) : null}
                              </BubbleContent>
                            </Bubble>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    ))}
                    <div className="support-prompt-chips" aria-label={supportCopy.suggestedQuestionsLabel}>
                      {prompts.map((item) => (
                        <Button
                          data-ai-support-intent={item.id}
                          key={item.id}
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => sendPrompt(item.prompt)}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>

                    {isGenerating || status !== supportCopy.ready ? (
                      <MessageScrollerItem className="support-status-item" messageId="support-status">
                        <Marker className={isGenerating ? "support-status generating" : "support-status"} role="status" aria-live="polite">
                          {isGenerating ? (
                            <>
                              <span className="support-typing-bubble" aria-hidden="true"><i /><i /><i /></span>
                              <MarkerContent>Assistant is typing</MarkerContent>
                            </>
                          ) : <MarkerContent>{status}</MarkerContent>}
                        </Marker>
                      </MessageScrollerItem>
                    ) : null}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
              </MessageScroller>
            </MessageScrollerProvider>

            {showHandoffPrompt ? (
              <div className="support-handoff-prompt" role="status">
                <Headphones size={18} strokeWidth={2.2} />
                <span>
                  <strong>{supportCopy.handoffTitle}</strong>
                  <em>{supportCopy.handoffDescription}</em>
                </span>
                <Button type="button" variant="primary" size="sm" onClick={() => void requestHumanHandoff()} loading={handoffSubmitting}>
                  {supportCopy.handoffAction}
                </Button>
              </div>
            ) : null}

            <form className="support-chat-form" onSubmit={handleSubmit}>
              <Input
                aria-label={supportCopy.inputLabel}
                autoComplete="off"
                value={draft}
                placeholder={supportCopy.inputPlaceholder}
                onChange={(event) => setDraft(event.target.value)}
              />
              <Button type="submit" variant="primary" size="icon" aria-label={supportCopy.sendLabel} aria-disabled={!draft.trim()}>
                <Send size={17} strokeWidth={2.3} />
              </Button>
            </form>
            <p className="support-disclaimer">{supportCopy.disclaimer}</p>
          </section>
        </div>
      ) : null}

      {!open ? <Button
        className="support-trigger"
        type="button"
        variant="primary"
        size="icon"
        aria-label={supportCopy.customerSupportLabel}
        aria-expanded={open}
        onClick={() => openSupport()}
      >
        <span className="support-trigger-dot" aria-hidden="true" />
        <MessageCircle size={27} strokeWidth={1.7} aria-hidden="true" />
      </Button> : null}
    </aside>
  );
}
