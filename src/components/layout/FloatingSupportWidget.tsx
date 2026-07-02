"use client";

import { Bot, Headphones, MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { assetPath } from "@/lib/assets";

type SupportChannel = "live" | "ai";

export function FloatingSupportWidget() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("Ready to connect");

  const requestSupport = (channel: SupportChannel) => {
    window.dispatchEvent(
      new CustomEvent("vanstro:support-request", {
        detail: { channel }
      })
    );
    setStatus(channel === "live" ? "Live support hook ready" : "AI support hook ready");
  };

  return (
    <aside className="support-widget" aria-label="Online customer support">
      {open ? (
        <div className="support-panel" role="dialog" aria-label="Support options">
          <div className="support-panel-head">
            <span>
              <MessageCircle size={18} strokeWidth={2.2} />
            </span>
            <div>
              <strong>VanStro support</strong>
              <small>{status}</small>
            </div>
            <button type="button" aria-label="Close support panel" onClick={() => setOpen(false)}>
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>

          <button
            className="support-option"
            type="button"
            data-support-channel="live"
            onClick={() => requestSupport("live")}
          >
            <Headphones size={20} strokeWidth={2.2} />
            <span>
              <strong>Online support</strong>
              <small>For orders, pickup and dealer questions</small>
            </span>
          </button>

          <button
            className="support-option"
            type="button"
            data-support-channel="ai"
            onClick={() => requestSupport("ai")}
          >
            <Bot size={20} strokeWidth={2.2} />
            <span>
              <strong>AI assistant</strong>
              <small>Reserved for product and checkout guidance</small>
            </span>
          </button>
        </div>
      ) : null}

      <button
        className="support-launcher"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
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
