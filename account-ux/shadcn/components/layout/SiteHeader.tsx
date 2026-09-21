"use client";

import Link from "next/link";
import {
  ChevronRight,
  Globe,
  Heart,
  LogOut,
  MapPin,
  Menu,
  ShoppingCart,
  UserCircle
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { assetPath } from "@/lib/assets";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { canonicalCatalogUrl, localeHref } from "@/lib/i18n/routes";
import { openCanonicalCatalog } from "@/lib/i18n/canonical-catalog";
import { useCustomerSession } from "@/components/account/CustomerSessionProvider";
import { localizeProductTaxonomyLabel } from "@/lib/product/product-localization";
import { dealerHoursKind } from "@/lib/dealer-hours";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from "@/components/ui/navigation-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";

function SearchBox() {
  const { copy, locale } = useLocale();

  return (
    <form className="search-box" action={assetPath(localeHref("/products", locale))}>
      <Input name="q" placeholder={copy.searchPlaceholder} aria-label={copy.searchLabel} />
      <Button type="submit" variant="primary">
        {copy.searchAction}
      </Button>
    </form>
  );
}

function DealerNavSelector({ compact = false }: { compact?: boolean }) {
  const { copy, dealers: prodDealers } = useLocale();
  const {
    postalCode,
    selectedDealerId,
    selectedDealerName,
    setPostalCode,
    setSelectedDealer
  } = useStorefront();
  const [open, setOpen] = useState(false);
  const [postalDraft, setPostalDraft] = useState(postalCode);
  const [now, setNow] = useState(() => new Date());

  const selectedDealer =
    prodDealers.find((dealer) => dealer.id === selectedDealerId) ??
    prodDealers.find((dealer) => dealer.name === selectedDealerName) ??
    prodDealers[0];

  useEffect(() => {
    setPostalDraft(postalCode);
  }, [postalCode]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!selectedDealer) return null;

  const hoursKind = dealerHoursKind(now);
  const hoursLabel =
    hoursKind === "open"
      ? copy.dealer.openHours
      : hoursKind === "closedUntilMonday"
        ? copy.dealer.closedUntilMonday
        : copy.dealer.closedHours;

  function handlePostalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPostalCode(postalDraft);
    const dealer = prodDealers[0];
    if (dealer) setSelectedDealer(dealer);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={compact ? "dealer-nav compact" : "dealer-nav"}>
        <PopoverTrigger asChild>
          <button
            className="dealer-current-button"
            type="button"
            aria-expanded={open}
          >
            <MapPin size={18} strokeWidth={2.2} />
            <span>
              <strong>{selectedDealer.city}</strong>
              <em>{hoursLabel}</em>
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="dealer-menu w-[min(420px,calc(100vw-32px))] p-3.5">
          <span>{copy.dealer.choose}</span>
          <form className="dealer-postal" onSubmit={handlePostalSubmit}>
            <Input
              aria-label={copy.dealer.postalCode}
              value={postalDraft}
              placeholder={selectedDealer.postalCode}
              onChange={(event) => setPostalDraft(event.target.value)}
            />
            <Button type="submit" variant="primary" size="sm">
              {copy.dealer.apply}
            </Button>
          </form>
          <div>
            {prodDealers.map((dealer) => (
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
        </PopoverContent>
      </div>
    </Popover>
  );
}

export function SiteHeader() {
  const { copy, locale, categories } = useLocale();
  const localizeHref = (href: string) => localeHref(href, locale);
  const productCategories = categories.length
    ? [
        { href: "/products", label: copy.allProductsLabel },
        ...categories.map((category) => ({
          href: `/products?category=${category.slug}`,
          label: localizeProductTaxonomyLabel(category.label, locale)
        }))
      ]
    : copy.productCategories;
  const navItems = copy.navItems;
  const [open, setOpen] = useState(false);
  const { cartCount, favoriteCount, storefrontConfigState } = useStorefront();
  const siteDisplayName = storefrontConfigState.effective.siteDisplayName || "VanStro Global Supply";
  const announcementRule = storefrontConfigState.effective.announcementRule;
  const announcementActive = announcementRule.enabled
    && announcementRule.message.trim().length > 0
    && (!announcementRule.startsAt || new Date(announcementRule.startsAt).getTime() <= Date.now())
    && (!announcementRule.endsAt || new Date(announcementRule.endsAt).getTime() >= Date.now());
  const customerSession = useCustomerSession();

  return (
    <header className="site-header">
      {announcementActive ? (
        <div className="header-announcement" role="status">
          <p>{announcementRule.message}</p>
        </div>
      ) : null}
      <div className="header-main">
        <div className="container header-inner">
          <Link href={localizeHref("/")} className="brand-link" aria-label={locale === "fr-CA" ? "Accueil VanStro" : "VanStro home"}>
            <img
              className="brand-logo"
              src={assetPath("/assets/vanstro-logo.png")}
              alt={siteDisplayName}
              width={315}
              height={63}
              loading="eager"
              decoding="async"
            />
            <span className="brand-text">{siteDisplayName}</span>
          </Link>

          <SearchBox />

          <DealerNavSelector />

          <div
            className="header-actions"
            data-authenticated={customerSession.status === "authenticated" ? "true" : undefined}
          >
            <Button asChild variant="ghost" className="icon-action">
              <Link
                href={locale === "fr-CA" ? "/" : "/fr/"}
                aria-label={locale === "fr-CA" ? "Passer en anglais" : "Switch to French"}
              >
                <Globe size={24} strokeWidth={2} />
                <span>{locale === "fr-CA" ? "FR" : "EN"}</span>
              </Link>
            </Button>
            {customerSession.status === "authenticated" ? (
              <>
                <Link
                  className="icon-action"
                  href={localizeHref("/account")}
                  aria-label={copy.account.myAccount}
                >
                  <UserCircle size={24} strokeWidth={2} />
                  <span>{copy.account.myAccountShort}</span>
                </Link>
                <button
                  className="icon-action"
                  type="button"
                  aria-label={copy.account.signOut}
                  onClick={() => void customerSession.logout()}
                >
                  <LogOut size={24} strokeWidth={2} />
                  <span>{copy.account.signOutShort}</span>
                </button>
              </>
            ) : (
              <Button asChild variant="ghost" className="icon-action">
                <Link href={localizeHref("/account/login")}>
                  <UserCircle size={24} strokeWidth={2} />
                  <span>{copy.account.signIn}</span>
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" className="icon-action">
              <Link href={localizeHref("/favorites")}>
                <Heart size={24} strokeWidth={2} />
                <span>{favoriteCount ? copy.account.savedCount(favoriteCount) : copy.account.saved}</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" className="icon-action">
              <Link href={localizeHref("/cart")}>
                <ShoppingCart size={24} strokeWidth={2} />
                <span>{cartCount ? copy.account.cartCount(cartCount) : copy.account.cart}</span>
              </Link>
            </Button>
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className="mobile-menu-trigger"
                type="button"
                aria-label={open ? copy.menu.close : copy.menu.open}
                aria-expanded={open}
                data-open={open}
              >
                <Menu size={22} strokeWidth={2} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="mobile-sheet-content w-[min(100%,24rem)] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>{copy.menu.mobileLabel}</SheetTitle>
              </SheetHeader>
              <div className="mobile-panel">
                <SearchBox />
                <DealerNavSelector compact />

                <div
                  className="mobile-quick-actions"
                  data-authenticated={customerSession.status === "authenticated" ? "true" : undefined}
                  aria-label={copy.menu.shortcutsLabel}
                >
                  {customerSession.status === "authenticated" ? (
                    <>
                      <Link href={localizeHref("/account")} onClick={() => setOpen(false)}>
                        <UserCircle size={21} strokeWidth={2} />
                        <span>{copy.account.myAccount}</span>
                      </Link>
                      <button type="button" onClick={() => { setOpen(false); void customerSession.logout(); }}>
                        <LogOut size={21} strokeWidth={2} />
                        <span>{copy.account.signOut}</span>
                      </button>
                    </>
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
                  <Link href={localizeHref("/dealer-access")} onClick={() => setOpen(false)}>
                    <span>{copy.dealerLogin}</span>
                    <ChevronRight size={18} strokeWidth={2} />
                  </Link>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="header-nav-bar">
        <div className="container header-nav-inner">
          <NavigationMenu viewport={false} className="desktop-nav max-w-none flex-none justify-start" aria-label={copy.menu.mainLabel}>
            <NavigationMenuList className="justify-start gap-0">
              <NavigationMenuItem className="desktop-nav-item catalog-nav-item">
                <NavigationMenuTrigger
                  className="catalog-nav-trigger"
                  aria-haspopup="menu"
                  onClick={() => openCanonicalCatalog(locale)}
                >
                  {copy.productsLabel}
                </NavigationMenuTrigger>
                <NavigationMenuContent className="catalog-dropdown p-0 md:w-64">
                  <span className="catalog-dropdown-heading">{copy.allProductsLabel}</span>
                  <div className="catalog-dropdown-list" role="menu" aria-label={copy.categoryMenuLabel}>
                    {productCategories.map((category) => (
                      <NavigationMenuLink key={category.label} asChild>
                        <Link
                          href={category.href === "/products" ? canonicalCatalogUrl(locale) : localizeHref(category.href)}
                          prefetch={false}
                          role="menuitem"
                          onClick={(event) => {
                            if (category.href === "/products") {
                              event.preventDefault();
                              openCanonicalCatalog(locale);
                            }
                          }}
                        >
                          {category.label}
                        </Link>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {navItems.map((item) => (
                <NavigationMenuItem className="desktop-nav-item" key={item.label}>
                  <NavigationMenuLink asChild>
                    <Link href={localizeHref(item.href)}>{item.label}</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
          <Button asChild variant="ghost" size="sm" className="header-dealer-login">
            <Link href={localizeHref("/dealer-access")}>{copy.dealerLogin}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
