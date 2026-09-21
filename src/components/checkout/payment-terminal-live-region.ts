import { createElement } from "react";

export function PaymentTerminalLiveRegion({ announcement }: { announcement: string }) {
  return createElement(
    "p",
    {
      className: "visually-hidden",
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true"
    },
    announcement
  );
}
