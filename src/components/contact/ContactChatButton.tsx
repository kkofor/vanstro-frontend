"use client";

import { Bot } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";

type ContactChatButtonProps = {
  variant?: "list" | "hero";
};

export function ContactChatButton({ variant = "list" }: ContactChatButtonProps) {
  const { copy } = useLocale();
  const requestAiSupport = () => {
    window.dispatchEvent(
      new CustomEvent("vanstro:support-request", {
        detail: { channel: "ai" }
      })
    );
  };

  if (variant === "hero") {
    return (
      <button className="button button-secondary contact-page-hero-chat" type="button" onClick={requestAiSupport}>
        {copy.contactChat.action}
      </button>
    );
  }

  return (
    <button className="contact-page-chat-button" type="button" onClick={requestAiSupport}>
      <Bot size={20} strokeWidth={2.2} />
      <span>
        <strong>{copy.contactChat.action}</strong>
        <small>{copy.contactChat.ready}</small>
      </span>
    </button>
  );
}
