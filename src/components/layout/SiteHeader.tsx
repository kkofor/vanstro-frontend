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
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { dealers } from "@/lib/data/dealers";
import { assetPath } from "@/lib/assets";

const productCategories = [
  { href: "/products", label: "All Products" },
  { href: "/products?category=kitchen-cabinets", label: "Kitchen Cabinets" },
  { href: "/products?category=bathroom-vanities", label: "Bathroom Vanities" },
  { href: "/products?category=baseboards", label: "Baseboards & Mouldings" },
  { href: "/products?category=doors-windows", label: "Doors & Windows" },
  { href: "/products?category=handle-series", label: "Handle Series" },
  { href: "/products", label: "Additional Categories" }
] as const;

const navItems = [
  { href: "/", label: "Home" },
  { href: "/articles", label: "Resource Center" },
  { href: "https://tools.vanstro.ca/", label: "Design Studio" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact us" }
];

function SearchBox() {
  return (
    <form className="search-box" action={assetPath("/products")}>
      <input name="q" placeholder="Search by product, SKU, or category..." aria-label="Search products" />
      <button type="submit">Search</button>
    </form>
  );
}

function pickDealerFromPostalCode() {
  return dealers[0];
}

function DealerNavSelector({ compact = false }: { compact?: boolean }) {
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
          <em>Open - closes 9 p.m.</em>
        </span>
      </button>

      <div className="dealer-menu" hidden={!open}>
        <span>Choose fulfillment dealer</span>
        <form className="dealer-postal" onSubmit={handlePostalSubmit}>
          <input
            aria-label="Postal code"
            value={postalDraft}
            placeholder={selectedDealer.postalCode}
            onChange={(event) => setPostalDraft(event.target.value)}
          />
          <button type="submit">Apply</button>
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
  const [open, setOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const { cartCount, favoriteCount } = useStorefront();
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
          <div className="utility-locale" aria-label="Locale">
            <span>CA - EN</span>
            <Link href="/">FR</Link>
          </div>
          <p>Shop online across Canada. A local VanStro dealer fulfills your order.</p>
          <div className="utility-links">
            <Link href="/orders/demo-order">Track order</Link>
            <Link href="/contact">Support</Link>
          </div>
        </div>
      </div>

      <div className="header-main">
        <div className="container header-inner">
          <Link href="/" className="brand-link" aria-label="VanStro home">
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
            <Link className="icon-action" href="/account/login">
              <UserCircle size={24} strokeWidth={2} />
              <span>Sign in</span>
            </Link>
            <Link className="icon-action" href="/favorites">
              <Heart size={24} strokeWidth={2} />
              <span>{favoriteCount ? `Saved ${favoriteCount}` : "Saved"}</span>
            </Link>
            <Link className="icon-action" href="/cart">
              <ShoppingCart size={24} strokeWidth={2} />
              <span>{cartCount ? `Cart ${cartCount}` : "Cart"}</span>
            </Link>
          </div>

          <button
            ref={mobileTriggerRef}
            className="mobile-menu-trigger"
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
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
          <nav className="desktop-nav" aria-label="Main navigation">
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
              <Link ref={catalogTriggerRef} className="catalog-nav-trigger" href="/products" prefetch={false} aria-haspopup="menu" aria-expanded={catalogOpen}>
                <span>Products</span>
                <ChevronDown size={15} strokeWidth={2.35} />
              </Link>

              <div className="catalog-dropdown" hidden={!catalogOpen}>
                <span className="catalog-dropdown-heading">All Products</span>
                <div className="catalog-dropdown-list" role="menu" aria-label="Product categories">
                  {productCategories.map((category) => (
                    <Link key={category.label} href={category.href} prefetch={false} role="menuitem" onClick={() => setCatalogOpen(false)}>
                      {category.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {navItems.map((item) => (
              <div className="desktop-nav-item" key={item.label}>
                <Link href={item.href}>{item.label}</Link>
              </div>
            ))}
          </nav>

          <div className="nav-cta-row">
            <Link className="nav-cta accent" href="/dealers/apply">
              Become a dealer
            </Link>
            <Link className="nav-cta" href="/account/login">
              Partner login
              <ChevronDown size={14} strokeWidth={2.4} />
            </Link>
          </div>
        </div>
      </div>

      <div className="container mobile-panel-anchor">
        <div className="mobile-panel" hidden={!open} ref={mobilePanelRef}>
          <SearchBox />
          <DealerNavSelector compact />

          <div className="mobile-quick-actions" aria-label="Account and cart shortcuts">
            <Link href="/account/login" onClick={() => setOpen(false)}>
              <UserCircle size={21} strokeWidth={2} />
              <span>Sign in</span>
            </Link>
            <Link href="/favorites" onClick={() => setOpen(false)}>
              <Heart size={21} strokeWidth={2} />
              <span>{favoriteCount ? `Saved ${favoriteCount}` : "Saved"}</span>
            </Link>
            <Link href="/cart" onClick={() => setOpen(false)}>
              <ShoppingCart size={21} strokeWidth={2} />
              <span>{cartCount ? `Cart ${cartCount}` : "Cart"}</span>
            </Link>
          </div>

          <nav className="mobile-nav-list" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} onClick={() => setOpen(false)}>
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
