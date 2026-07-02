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
import { FormEvent, useEffect, useState } from "react";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { dealers } from "@/lib/data/mock-data";
import { assetPath } from "@/lib/assets";

const navItems = [
  { href: "/products", label: "Products" },
  { href: "/articles", label: "Resource Center" },
  { href: "https://tools.vanstro.ca/", label: "Design Studio" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact us" }
];

function SearchBox() {
  return (
    <form className="search-box" action="/products">
      <input name="q" placeholder="Search by product, SKU, or category..." aria-label="Search products" />
      <button type="submit">Search</button>
    </form>
  );
}

function pickDealerFromPostalCode(postalCode: string) {
  const normalized = postalCode.trim().toUpperCase();
  if (normalized.startsWith("V") || normalized.startsWith("B")) {
    return dealers.find((dealer) => dealer.id === "vancouver");
  }
  if (normalized.startsWith("T")) {
    return dealers.find((dealer) => dealer.id === "calgary");
  }
  if (normalized.startsWith("H")) {
    return dealers.find((dealer) => dealer.id === "montreal");
  }
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
  const [open, setOpen] = useState(false);
  const [postalDraft, setPostalDraft] = useState(postalCode);

  const selectedDealer =
    dealers.find((dealer) => dealer.id === selectedDealerId) ??
    dealers.find((dealer) => dealer.name === selectedDealerName) ??
    dealers[0];

  useEffect(() => {
    setPostalDraft(postalCode);
  }, [postalCode]);

  function handlePostalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPostalCode(postalDraft);
    const dealer = pickDealerFromPostalCode(postalDraft);
    if (dealer) setSelectedDealer(dealer);
  }

  return (
    <div className={compact ? "dealer-nav compact" : "dealer-nav"}>
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
  const { cartCount, favoriteCount } = useStorefront();

  return (
    <header className="site-header">
      <div className="header-utility">
        <div className="container header-utility-inner">
          <div className="utility-locale" aria-label="Locale">
            <span>CA - EN</span>
            <Link href="/">FR</Link>
          </div>
          <p>Shop online, checkout, then a local VanStro dealer fulfills your order.</p>
          <div className="utility-links">
            <Link href="/orders/demo-order">Track order</Link>
            <Link href="/articles">Support</Link>
          </div>
        </div>
      </div>

      <div className="header-main">
        <div className="container header-inner">
          <Link href="/" className="brand-link" aria-label="VanStro home">
            <img className="brand-logo" src={assetPath("/assets/vanstro-logo.png")} alt="VanStro Global Supply" />
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
            {navItems.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
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
        <div className="mobile-panel" hidden={!open}>
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
