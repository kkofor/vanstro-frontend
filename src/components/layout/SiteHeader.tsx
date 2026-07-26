"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Heart,
  MapPin,
  Menu,
  ShoppingCart,
  UserCircle,
  X
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { dealers } from "@/lib/data/dealers";
import { assetPath } from "@/lib/assets";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { alternateLocaleHref, localeHref } from "@/lib/i18n/routes";
import { useCustomerSession } from "@/components/account/CustomerSessionProvider";

function SearchBox() {
  const { copy, locale } = useLocale();

  return (
    <form className="search-box" action={assetPath(localeHref("/products", locale))}>
      <input name="q" placeholder={copy.searchPlaceholder} aria-label={copy.searchLabel} />
      <button type="submit">{copy.searchAction}</button>
    </form>
  );
}

function pickDealerFromPostalCode() {
  return dealers[0];
}

function DealerNavSelector({ compact = false }: { compact?: boolean }) {
  const { copy } = useLocale();
  const {
    postalCode,
    selectedDealerId,
    selectedDealerName,
    setPostalCode,
    setSelectedDealer
  } = useStorefront();
  const navRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [postalDraft, setPostalDraft] = useState(postalCode);

  const selectedDealer =
    dealers.find((dealer) => dealer.id === selectedDealerId) ??
    dealers.find((dealer) => dealer.name === selectedDealerName) ??
    dealers[0];

  useEffect(() => {
    setPostalDraft(postalCode);
  }, [postalCode]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && navRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handlePostalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPostalCode(postalDraft);
    const dealer = pickDealerFromPostalCode();
    if (dealer) setSelectedDealer(dealer);
  }

  return (
    <div className={compact ? "dealer-nav compact" : "dealer-nav"} ref={navRef}>
      <button
        className="dealer-current-button"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MapPin size={18} strokeWidth={2.2} />
        <span>
          <strong>{selectedDealer.city}</strong>
          <em>{copy.dealer.openHours}</em>
        </span>
      </button>

      <div className="dealer-menu" hidden={!open}>
        <span>{copy.dealer.choose}</span>
        <form className="dealer-postal" onSubmit={handlePostalSubmit}>
          <input
            aria-label={copy.dealer.postalCode}
            value={postalDraft}
            placeholder={selectedDealer.postalCode}
            onChange={(event) => setPostalDraft(event.target.value)}
          />
          <button type="submit">{copy.dealer.apply}</button>
        </form>
        <div>
          {dealers.map((dealer) => (
            <button
              className={dealer.id === selectedDealer.id ? "active" : ""}
              type="button"
              onClick={() => {
                setSelectedDealer(dealer);
                setOpen(false);
              }}
              key={dealer.id}
            >
              <strong>{dealer.city}</strong>
              <small>{dealer.postalCode}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const { copy, locale } = useLocale();
  const pathname = usePathname();
  const currentHref = pathname;
  const localizeHref = (href: string) => localeHref(href, locale);
  const productCategories = copy.productCategories;
  const navItems = copy.navItems;
  const [open, setOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const { cartCount, favoriteCount } = useStorefront();
  const customerSession = useCustomerSession();
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const catalogTriggerRef = useRef<HTMLAnchorElement>(null);
  const catalogNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && !catalogOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (open && !mobileTriggerRef.current?.contains(event.target)) {
        const interactiveTarget = event.target instanceof Element
          ? event.target.closest("a, button, input, select, textarea")
          : null;
        if (!mobilePanelRef.current?.contains(event.target) || !interactiveTarget) {
          setOpen(false);
        }
      }
      if (catalogOpen && !catalogNavRef.current?.contains(event.target)) {
        setCatalogOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (catalogOpen) {
        setCatalogOpen(false);
        catalogTriggerRef.current?.focus();
        return;
      }
      if (open) {
        setOpen(false);
        mobileTriggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("click", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("click", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [catalogOpen, open]);

  return (
    <header className="site-header">
      <div className="header-utility">
        <div className="container header-utility-inner">
          <div className="utility-locale" aria-label={copy.localeLabel}>
            <span>{copy.currentLocale}</span>
            <Link
              href={alternateLocaleHref(currentHref)}
              hrefLang={locale === "fr-CA" ? "en-CA" : "fr-CA"}
            >
              {copy.alternateLocale}
            </Link>
          </div>
          <p>{copy.utilityMessage}</p>
          <div className="utility-links">
            <Link href={localizeHref("/orders/demo-order")}>{copy.trackOrder}</Link>
            <Link href={localizeHref("/contact")}>{copy.support}</Link>
          </div>
        </div>
      </div>

      <div className="header-main">
        <div className="container header-inner">
          <Link href={localizeHref("/")} className="brand-link" aria-label={locale === "fr-CA" ? "Accueil VanStro" : "VanStro home"}>
            <img
              className="brand-logo"
              src={assetPath("/assets/vanstro-logo.png")}
              alt="VanStro Global Supply"
              width={315}
              height={63}
              loading="eager"
              decoding="async"
            />
          </Link>

          <SearchBox />

          <DealerNavSelector />

          <div className="header-actions">
            {customerSession.status === "authenticated" ? (
              <button className="icon-action" type="button" onClick={() => void customerSession.logout()}>
                <UserCircle size={24} strokeWidth={2} />
                <span>{copy.account.signOut}</span>
              </button>
            ) : (
              <Link className="icon-action" href={localizeHref("/account/login")}>
                <UserCircle size={24} strokeWidth={2} />
                <span>{copy.account.signIn}</span>
              </Link>
            )}
            <Link className="icon-action" href={localizeHref("/favorites")}>
              <Heart size={24} strokeWidth={2} />
              <span>{favoriteCount ? copy.account.savedCount(favoriteCount) : copy.account.saved}</span>
            </Link>
            <Link className="icon-action" href={localizeHref("/cart")}>
              <ShoppingCart size={24} strokeWidth={2} />
              <span>{cartCount ? copy.account.cartCount(cartCount) : copy.account.cart}</span>
            </Link>
          </div>

          <button
            ref={mobileTriggerRef}
            className="mobile-menu-trigger"
            type="button"
            aria-label={open ? copy.menu.close : copy.menu.open}
            aria-expanded={open}
            data-open={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
          </button>
        </div>
      </div>

      <div className="header-nav-bar">
        <div className="container header-nav-inner">
          <nav className="desktop-nav" aria-label={copy.menu.mainLabel}>
            <div
              ref={catalogNavRef}
              className="desktop-nav-item catalog-nav-item"
              onMouseEnter={() => setCatalogOpen(true)}
              onMouseLeave={() => setCatalogOpen(false)}
              onFocusCapture={() => setCatalogOpen(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setCatalogOpen(false);
                }
              }}
            >
              <Link ref={catalogTriggerRef} className="catalog-nav-trigger" href={localizeHref("/products")} prefetch={false} aria-haspopup="menu" aria-expanded={catalogOpen}>
                <span>{copy.productsLabel}</span>
                <ChevronDown size={15} strokeWidth={2.35} />
              </Link>

              <div className="catalog-dropdown" hidden={!catalogOpen}>
                <span className="catalog-dropdown-heading">{copy.allProductsLabel}</span>
                <div className="catalog-dropdown-list" role="menu" aria-label={copy.categoryMenuLabel}>
                  {productCategories.map((category) => (
                    <Link key={category.label} href={localizeHref(category.href)} prefetch={false} role="menuitem" onClick={() => setCatalogOpen(false)}>
                      {category.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {navItems.map((item) => (
              <div className="desktop-nav-item" key={item.label}>
                <Link href={localizeHref(item.href)}>{item.label}</Link>
              </div>
            ))}
          </nav>

          <div className="nav-cta-row">
            <Link className="nav-cta accent" href={localizeHref("/dealers/apply")}>
              {copy.becomeDealer}
            </Link>
            <Link className="nav-cta" href={localizeHref("/account/login")}>
              {copy.partnerLogin}
              <ChevronDown size={14} strokeWidth={2.4} />
            </Link>
          </div>
        </div>
      </div>

      <div className="container mobile-panel-anchor">
        <div className="mobile-panel" hidden={!open} ref={mobilePanelRef}>
          <SearchBox />
          <DealerNavSelector compact />

          <div className="mobile-quick-actions" aria-label={copy.menu.shortcutsLabel}>
            {customerSession.status === "authenticated" ? (
              <button type="button" onClick={() => { setOpen(false); void customerSession.logout(); }}>
                <UserCircle size={21} strokeWidth={2} />
                <span>{copy.account.signOut}</span>
              </button>
            ) : (
              <Link href={localizeHref("/account/login")} onClick={() => setOpen(false)}>
                <UserCircle size={21} strokeWidth={2} />
                <span>{copy.account.signIn}</span>
              </Link>
            )}
            <Link href={localizeHref("/favorites")} onClick={() => setOpen(false)}>
              <Heart size={21} strokeWidth={2} />
              <span>{favoriteCount ? copy.account.savedCount(favoriteCount) : copy.account.saved}</span>
            </Link>
            <Link href={localizeHref("/cart")} onClick={() => setOpen(false)}>
              <ShoppingCart size={21} strokeWidth={2} />
              <span>{cartCount ? copy.account.cartCount(cartCount) : copy.account.cart}</span>
            </Link>
          </div>

          <nav className="mobile-nav-list" aria-label={copy.menu.mobileLabel}>
            {navItems.map((item) => (
              <Link key={item.label} href={localizeHref(item.href)} onClick={() => setOpen(false)}>
                <span>{item.label}</span>
                <ChevronRight size={18} strokeWidth={2} />
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
