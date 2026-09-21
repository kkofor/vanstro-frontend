"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CookiePreferencesButton } from "@/components/layout/CookiePreferencesButton";
import { getLegalNavLinks } from "@/content/legalPages";
import { assetPath } from "@/lib/assets";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { canonicalCatalogUrl, localeHref } from "@/lib/i18n/routes";
import { handleCanonicalCatalogClick } from "@/lib/i18n/canonical-catalog";
import { localizeProductTaxonomyLabel } from "@/lib/product/product-localization";

type SocialChannel = {
  label: string;
  href: string;
  icon: "facebook" | "youtube" | "pinterest" | "tiktok" | "linkedin";
};

const socialChannels: SocialChannel[] = [
  { label: "Facebook", icon: "facebook", href: "https://www.facebook.com/profile.php?id=61591722131934" },
  { label: "LinkedIn", icon: "linkedin", href: "https://www.linkedin.com/company/138484627/" },
  { label: "Pinterest", icon: "pinterest", href: "https://www.pinterest.com/VanStro/" },
  { label: "YouTube", icon: "youtube", href: "https://www.youtube.com/@vanstroglobal" },
  { label: "TikTok", icon: "tiktok", href: "https://www.tiktok.com/@vanstro_home" }
];

function SocialIcon({ icon }: { icon: SocialChannel["icon"] }) {
  if (icon === "youtube") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.6 12 5.6 12 5.6s-5 0-6.9.5A3 3 0 0 0 3 8.2a31.5 31.5 0 0 0-.5 3.8 31.5 31.5 0 0 0 .5 3.8 3 3 0 0 0 2.1 2.1c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.1 31.5 31.5 0 0 0 .5-3.8 31.5 31.5 0 0 0-.5-3.8Z" />
        <path d="m10.2 15.3 5-3.3-5-3.3v6.6Z" className="social-icon-cutout" />
      </svg>
    );
  }

  if (icon === "pinterest") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 20V5h5.2c3.1 0 5 1.7 5 4.3s-1.9 4.4-5 4.4h-2.2V20H8Zm3-9.1h2.1c1.4 0 2.2-.6 2.2-1.7s-.8-1.7-2.2-1.7H11v3.4Z" />
      </svg>
    );
  }

  if (icon === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.1 4.2h2.7c.3 2.2 1.6 3.8 3.7 4.1v2.8a7.1 7.1 0 0 1-3.6-1.2v5.4c0 3.1-2.1 5-5.1 5-2.7 0-4.7-1.8-4.7-4.3 0-2.8 2.2-4.5 5.4-4.3v2.9c-1.3-.2-2.3.4-2.3 1.4 0 .8.7 1.4 1.6 1.4 1 0 2.3-.5 2.3-2.4V4.2Z" />
      </svg>
    );
  }

  if (icon === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.7 9.2H3.8v10.1h2.9V9.2ZM5.2 7.8a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4ZM9.1 9.2h2.8v1.4c.5-.9 1.6-1.6 3.1-1.6 3 0 4.2 1.9 4.2 4.8v5.5h-2.9v-5.1c0-1.7-.6-2.5-1.9-2.5s-2.4 1-2.4 2.7v4.9H9.1V9.2Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.5 20v-7h2.4l.4-3h-2.8V8.1c0-.9.3-1.5 1.6-1.5h1.4V4c-.7-.1-1.4-.2-2.2-.2-2.8 0-4.4 1.7-4.4 4.1V10H7.5v3h2.4v7h3.6Z" />
    </svg>
  );
}

export function SiteFooter() {
  const { copy, locale, categories } = useLocale();
  const footerCopy = copy.footer;
  // API-driven categories replace the hardcoded category links in the Shop
  // group; the static locale copy remains the fallback without an API.
  const footerGroups = categories.length
    ? footerCopy.groups.map((group) =>
        group.links[0]?.href === "/products"
          ? {
              ...group,
              links: [
                group.links[0],
                ...categories.map((category) => ({
                  href: `/products?category=${category.slug}`,
                  label: localizeProductTaxonomyLabel(category.label, locale)
                }))
              ]
            }
          : group
      )
    : footerCopy.groups;

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-link-grid">
        <div className="footer-brand">
            <Link href={localeHref("/", locale)} aria-label={locale === "fr-CA" ? "Accueil VanStro" : "VanStro home"}>
              <img
                src={assetPath("/assets/vanstro-logo.png")}
                alt="VanStro Global Supply"
                width={315}
                height={63}
                loading="lazy"
                decoding="async"
              />
            </Link>
            <p>{footerCopy.description}</p>
            <div className="footer-contact-list" aria-label={footerCopy.contactLabel}>
              <Button asChild variant="link" className="footer-contact-link">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=856+Century+Street+Winnipeg+MB+R3H+0M5"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin size={16} strokeWidth={2.2} />
                  {footerCopy.serviceArea}
                </a>
              </Button>
              <Button asChild variant="link" className="footer-contact-link">
                <a href="mailto:support@vanstro.ca">
                  <Mail size={16} strokeWidth={2.2} />
                  support@vanstro.ca
                </a>
              </Button>
              <Button asChild variant="link" className="footer-contact-link">
                <a href="tel:+12042212288">
                  <Phone size={16} strokeWidth={2.2} />
                  {footerCopy.localFulfillment}
                </a>
              </Button>
            </div>
            <div className="footer-social" aria-label={footerCopy.socialLabel}>
              <div className="social-links">
                {socialChannels.map((channel) => (
                  <a
                    href={channel.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={channel.label}
                    key={channel.label}
                  >
                    <span>
                      <SocialIcon icon={channel.icon} />
                    </span>
                  </a>
                ))}
              </div>
            </div>
        </div>
          <div className="footer-groups">
          {footerGroups.map((group) => (
            <nav className="footer-group" aria-label={group.title} key={group.title}>
              <h2>{group.title}</h2>
              {group.links.map((link) => (
                <Button asChild variant="link" className="footer-group-link" key={link.label}>
                  <Link
                    href={link.href === "/products" ? canonicalCatalogUrl(locale) : localeHref(link.href, locale)}
                    prefetch={false}
                    onClick={link.href === "/products" ? handleCanonicalCatalogClick(locale) : undefined}
                  >
                    {link.label}
                  </Link>
                </Button>
              ))}
            </nav>
          ))}
          </div>
        </div>

        <div className="footer-bottom">
          <p>{footerCopy.copyright}</p>
          <div className="footer-legal">
            {getLegalNavLinks(locale).filter((link) => link.href !== "/cookie-settings").slice(0, 3).map((link) => (
              <Button asChild variant="link" className="footer-legal-link" key={link.href}>
                <Link href={localeHref(link.href, locale)}>
                  {link.label}
                </Link>
              </Button>
            ))}
            <CookiePreferencesButton />
            {getLegalNavLinks(locale).filter((link) => link.href !== "/cookie-settings").slice(3).map((link) => (
              <Button asChild variant="link" className="footer-legal-link" key={link.href}>
                <Link href={localeHref(link.href, locale)}>
                  {link.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
