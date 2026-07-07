"use client";

import { Bot } from "lucide-react";

type ContactChatButtonProps = {
  variant?: "list" | "hero";
};

export function ContactChatButton({ variant = "list" }: ContactChatButtonProps) {
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
        Chat with us
      </button>
    );
  }

  return (
    <button className="contact-page-chat-button" type="button" onClick={requestAiSupport}>
      <Bot size={20} strokeWidth={2.2} />
      <span>
        <strong>Chat with us</strong>
        <small>AI assistant ready</small>
      </span>
    </button>
  );
}
