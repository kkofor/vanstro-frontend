"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";

export function LocalizedSkipLink() {
  const { copy } = useLocale();

  return (
    <a className="skip-link" href="#main-content">
      {copy.skipToContent}
    </a>
  );
}
