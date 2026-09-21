/* HTML prototype mount for shadcn/components/layout/SiteHeader.tsx
   Source: vanity-selector-260904 (not main storefront).
   Styles: assets/storefront-chrome.css
   Usage: <header class="site-header" data-site-header></header>
   Signed-in state comes from same-origin GET /api/me (vs_session cookie). data-signed-in is a
   last-resort fallback for pages served without network (components.html, flows.html). */
(function () {
  const SITE = 'https://www.vanstro.ca';
  const FR = /^\/fr(\/|$)/.test(location.pathname);
  const S = FR ? {
    products: 'Produits',
    allProducts: 'Tous les produits',
    categoryMenu: 'Catégories de produits',
    searchPlaceholder: 'Rechercher par produit, UGS ou catégorie…',
    searchLabel: 'Rechercher des produits',
    searchAction: 'Rechercher',
    chooseDealer: 'Choisir un détaillant local',
    postalCode: 'Code postal',
    apply: 'Valider',
    locale: 'Langue',
    signIn: 'Se connecter',
    signOut: 'Se déconnecter',
    exit: 'Quitter',
    myAccount: 'Mon compte',
    accountFallback: 'Compte',
    saved: 'Favoris',
    cart: 'Panier',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    mainNav: 'Navigation principale',
    mobileNav: 'Navigation mobile',
    shortcuts: 'Raccourcis du compte et du panier',
    dealerLogin: 'Connexion détaillant',
    support: 'Service à la clientèle',
    ourCompany: 'Entreprise',
    resourceCenter: 'Centre de ressources',
    downloadCenter: 'Centre de téléchargement',
    blog: 'Blogue',
    guides: 'Guides'
  } : {
    products: 'Products',
    allProducts: 'All Products',
    categoryMenu: 'Product categories',
    searchPlaceholder: 'Search by product, SKU, or category...',
    searchLabel: 'Search products',
    searchAction: 'Search',
    chooseDealer: 'Choose a local dealer',
    postalCode: 'Postal code',
    apply: 'Apply',
    locale: 'Locale',
    signIn: 'Sign in',
    signOut: 'Sign out',
    exit: 'Exit',
    myAccount: 'My account',
    accountFallback: 'Account',
    saved: 'Saved',
    cart: 'Cart',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    mainNav: 'Main navigation',
    mobileNav: 'Mobile navigation',
    shortcuts: 'Account and cart shortcuts',
    dealerLogin: 'Dealer login',
    support: 'Support',
    ourCompany: 'Company',
    resourceCenter: 'Resource center',
    downloadCenter: 'Download center',
    blog: 'Blog',
    guides: 'Guides'
  };
  const I = {
    pin: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    globe: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.7V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.7"/></svg>',
    exit: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    heart: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9.5a5.5 5.5 0 0 1 9.6-3.7.6.6 0 0 0 .8 0A5.5 5.5 0 0 1 22 9.5c0 2.3-1.5 4-3 5.5l-5.5 5.3a2 2 0 0 1-3 0L5 15c-1.5-1.5-3-3.2-3-5.5Z"/></svg>',
    cart: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16M4 12h16M4 19h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  };

  /* site-copy.ts englishCopy in vanity-selector-260904 */
  const PRODUCTS = FR ? [
    ['Tous les produits', '/products'],
    ['Armoires de cuisine', '/products?category=kitchen-cabinets'],
    ['Meubles-lavabos', '/products?category=bathroom-vanities'],
    ['Plinthes et moulures', '/products?category=baseboards'],
    ['Poignées', '/products?category=handle-series'],
  ] : [
    ['All Products', '/products'],
    ['Kitchen Cabinets', '/products?category=kitchen-cabinets'],
    ['Bathroom Vanities', '/products?category=bathroom-vanities'],
    ['Baseboards & Mouldings', '/products?category=baseboards'],
    ['Handle Series', '/products?category=handle-series'],
  ];
  const NAV = FR ? [
    ['Accueil', '/'],
  ] : [
    ['Home', '/'],
  ];
  /* Resource Center / Support / Company are expand-only dropdown groups (button, no href).
     Parent has no landing page of its own, so a first click/tap must open the group, never navigate. */
  const RC_ITEMS = FR ? [
    [S.blog, '/blog'],
    [S.guides, '/guides'],
    [S.downloadCenter, '/articles'],
  ] : [
    [S.blog, '/blog'],
    [S.guides, '/guides'],
    [S.downloadCenter, '/articles'],
  ];
  const SUPPORT_ITEMS = FR ? [
    ['FAQ', '/faq'],
    ['Garantie', '/warranty'],
    ['Nous joindre', '/contact'],
  ] : [
    ['FAQ', '/faq'],
    ['Warranty', '/warranty'],
    ['Contact us', '/contact'],
  ];
  const COMPANY_ITEMS = FR ? [
    ['Culture', '/our-culture'],
    ['À propos', '/about'],
    ['Carrières', '/careers'],
    ['Carte des détaillants', '/dealers/map'],
    ['Programme pour les détaillants', '/dealer-program'],
  ] : [
    ['Careers', '/careers'],
    ['About us', '/about'],
    ['Our culture', '/our-culture'],
    ['Dealer map', '/dealers/map'],
    ['Dealer program', '/dealer-program'],
  ];
  const DEALERS = [
    { id: 'MB-YUAN', city: 'Winnipeg', postalCode: 'R2X 1R3', hours: FR ? 'Lun–Ven 9 h–17 h' : 'Mon–Fri 9 a.m.–5 p.m.' },
  ];

  function localizeHref(h) {
    if (!h || h.charAt(0) !== '/') return h;
    const p = location.pathname || '';
    const fr = p === '/fr' || p.indexOf('/fr/') === 0;
    if (!fr || h.indexOf('/fr') === 0) return h;
    if (h === '/') return '/fr/';
    const auth = [['/account/login', '/fr/login'], ['/account/register', '/fr/register'], ['/account/forgot-password', '/fr/account/forgot-password']];
    for (let i = 0; i < auth.length; i++) {
      const en = auth[i][0]; const to = auth[i][1];
      if (h === en) return to;
      if (h.indexOf(en + '?') === 0 || h.indexOf(en + '#') === 0) return to + h.slice(en.length);
    }
    if (h === '/login' || h === '/register') return '/fr' + h;
    if (h === '/forgot-password') return '/fr/account/forgot-password';
    if (h.indexOf('/login?') === 0 || h.indexOf('/register?') === 0) return '/fr' + h;
    if (h.indexOf('/forgot-password?') === 0) return '/fr/account/forgot-password' + h.slice('/forgot-password'.length);
    return '/fr' + h;
  }
  /* Internal storefront links stay on the current locale. Do not prefix assets, APIs, mailto, or #. */
  const href = (h) => {
    if (!h) return h;
    if (h.startsWith('http') || h.startsWith('#') || h.endsWith('.html')) return h;
    return localizeHref(h);
  };

  function searchBox() {
    return `<form class="search-box" action="${href('/products')}" method="get" role="search">
      <input name="q" type="search" placeholder="${S.searchPlaceholder}" aria-label="${S.searchLabel}" autocomplete="off">
      <button type="submit">${S.searchAction}</button>
    </form>`;
  }

  function dealerNav(compact) {
    const d = DEALERS[0];
    return `<div class="dealer-nav${compact ? ' compact' : ''}" data-dealer-nav>
      <button class="dealer-current-button" type="button" aria-expanded="false">
        ${I.pin}
        <span><strong>${d.city}</strong><em>${d.hours}</em></span>
      </button>
      <div class="dealer-menu" hidden>
        <span>${S.chooseDealer}</span>
        <form class="dealer-postal" onsubmit="return false">
          <input aria-label="${S.postalCode}" placeholder="${d.postalCode}" value="">
          <button type="submit">${S.apply}</button>
        </form>
        <div>
          ${DEALERS.map((x) => `<button class="active" type="button" data-dealer-id="${x.id}"><strong>${x.city}</strong><small>${x.postalCode}</small></button>`).join('')}
        </div>
      </div>
    </div>`;
  }

  function localeControl() {
    return `<div class="lang" role="group" aria-label="${S.locale}">
      <button class="icon-action is-active" type="button" data-lang="en" aria-label="Switch to French">${I.globe}<span>EN</span></button>
      <button class="icon-action" type="button" data-lang="fr" hidden aria-label="Passer en anglais">${I.globe}<span>FR</span></button>
    </div>`;
  }

  function accountActions(signedIn, accountHref, loginHref, cartHref, cartId, size, label) {
    const name = label || S.accountFallback;
    const s = size === 'mobile' ? 21 : 24;
    const user = I.user.replace(/width="24"/, `width="${s}"`).replace(/height="24"/, `height="${s}"`);
    const exit = I.exit.replace(/width="24"/, `width="${s}"`).replace(/height="24"/, `height="${s}"`);
    const heart = I.heart.replace(/width="24"/, `width="${s}"`).replace(/height="24"/, `height="${s}"`);
    const cart = I.cart.replace(/width="24"/, `width="${s}"`).replace(/height="24"/, `height="${s}"`);
    const cartAttrs = `href="${cartHref}"${cartId && size === 'desktop' ? ` id="${cartId}"` : ''}`;
    if (size === 'mobile') {
      const auth = signedIn
        ? `<a href="${accountHref}">${user}<span>${name}</span></a>
           <button type="button" data-sign-out>${exit}<span>${S.signOut}</span></button>`
        : `<a href="${loginHref}">${user}<span>${S.signIn}</span></a>`;
      return `${auth}
        <a href="${href('/favorites')}">${heart}<span>${S.saved}</span></a>
        <a ${cartAttrs}>${cart}<span>${S.cart}</span></a>`;
    }
    const auth = signedIn
      ? `<a class="icon-action" href="${accountHref}" aria-label="${S.myAccount}">${user}<span>${name}</span></a>
         <button class="icon-action" type="button" data-sign-out aria-label="${S.signOut}">${exit}<span>${S.exit}</span></button>`
      : `<a class="icon-action" href="${loginHref}">${user}<span>${S.signIn}</span></a>`;
    return `${localeControl()}
      ${auth}
      <a class="icon-action" href="${href('/favorites')}">${heart}<span>${S.saved}</span></a>
      <a class="icon-action" ${cartAttrs}>${cart}<span>${S.cart}</span></a>`;
  }

  document.querySelectorAll('[data-site-header]').forEach((el) => {
    const accountHref = localizeHref(el.getAttribute('data-account-href') || '/account');
    const loginHref = localizeHref(el.getAttribute('data-login-href') || '/account/login');
    const cartHref = localizeHref(el.getAttribute('data-cart-href') || '/cart');
    const cartId = el.getAttribute('data-cart-id') || '';
    fetch('/api/me', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((me) => {
    const signedIn = !!(me && (me.userId || me.email));
    const userLabel = (me && ((me.name && String(me.name).trim()) || (me.email ? String(me.email).split('@')[0] : ''))) || 'Account';
    el.setAttribute('data-signed-in', signedIn ? '1' : '0');

    el.innerHTML = `
      <div class="header-main">
        <div class="container header-inner">
          <a class="brand-link" href="${href('/')}" aria-label="VanStro home">
            <img class="brand-logo" src="/account/assets/vanstro-logo.png" alt="VanStro Global Supply" width="315" height="63" decoding="async">
            <span class="brand-text">VanStro Global Supply</span>
          </a>
          ${searchBox()}
          ${dealerNav(false)}
          <div class="header-actions" ${signedIn ? 'data-authenticated="true"' : ''}>
            ${accountActions(signedIn, accountHref, loginHref, cartHref, cartId, 'desktop', userLabel)}
          </div>
          <button class="mobile-menu-trigger" type="button" aria-label="${S.openMenu}" aria-expanded="false" data-menu-open="false">
            ${I.menu}
          </button>
        </div>
      </div>

      <div class="header-nav-bar">
        <div class="container header-nav-inner">
          <nav class="desktop-nav" aria-label="${S.mainNav}">
            <div class="desktop-nav-item catalog-nav-item" data-catalog>
              <button class="catalog-nav-trigger" type="button" aria-haspopup="menu" aria-expanded="false">
                <span>${S.products}</span>${I.chevronDown}
              </button>
              <div class="catalog-dropdown" hidden>
                <span class="catalog-dropdown-heading">${S.allProducts}</span>
                <div class="catalog-dropdown-list" role="menu" aria-label="${S.categoryMenu}">
                  ${PRODUCTS.map(([t, h]) => `<a href="${href(h)}" role="menuitem">${t}</a>`).join('')}
                </div>
              </div>
            </div>
            ${NAV.map(([t, h]) => `<div class="desktop-nav-item"><a href="${href(h)}">${t}</a></div>`).join('')}
            <div class="desktop-nav-item catalog-nav-item" data-nav-dropdown="rc">
              <button class="catalog-nav-trigger" type="button" aria-haspopup="menu" aria-expanded="false">
                <span>${S.resourceCenter}</span>${I.chevronDown}
              </button>
              <div class="catalog-dropdown nav-menu-dropdown" hidden>
                <div class="catalog-dropdown-list" role="menu" aria-label="${S.resourceCenter}">
                  ${RC_ITEMS.map(([t, h]) => `<a href="${href(h)}" role="menuitem">${t}</a>`).join('')}
                </div>
              </div>
            </div>
            <div class="desktop-nav-item catalog-nav-item" data-nav-dropdown="company">
              <button class="catalog-nav-trigger" type="button" aria-haspopup="menu" aria-expanded="false">
                <span>${S.ourCompany}</span>${I.chevronDown}
              </button>
              <div class="catalog-dropdown nav-menu-dropdown" hidden>
                <div class="catalog-dropdown-list" role="menu" aria-label="${S.ourCompany}">
                  ${COMPANY_ITEMS.map(([t, h]) => `<a href="${href(h)}" role="menuitem">${t}</a>`).join('')}
                </div>
              </div>
            </div>
            <div class="desktop-nav-item catalog-nav-item" data-nav-dropdown="support">
              <button class="catalog-nav-trigger" type="button" aria-haspopup="menu" aria-expanded="false">
                <span>${S.support}</span>${I.chevronDown}
              </button>
              <div class="catalog-dropdown nav-menu-dropdown" hidden>
                <div class="catalog-dropdown-list" role="menu" aria-label="${S.support}">
                  ${SUPPORT_ITEMS.map(([t, h]) => `<a href="${href(h)}" role="menuitem">${t}</a>`).join('')}
                </div>
              </div>
            </div>
          </nav>
          <a class="header-dealer-login" href="${href('/dealer-access')}">${S.dealerLogin}</a>
        </div>
      </div>

      <div class="container mobile-panel-anchor">
        <div class="mobile-panel" hidden data-mobile-panel>
          ${searchBox()}
          ${dealerNav(true)}
          <div class="mobile-quick-actions" ${signedIn ? 'data-authenticated="true"' : ''} aria-label="${S.shortcuts}">
            ${accountActions(signedIn, accountHref, loginHref, cartHref, '', 'mobile', userLabel)}
          </div>
          <nav class="mobile-nav-list" aria-label="${S.mobileNav}">
            ${NAV.map(([t, h]) => `<a href="${href(h)}"><span>${t}</span>${I.chevronRight}</a>`).join('')}
            <div class="mobile-nav-group" data-mobile-nav-group="rc">
              <button class="mobile-nav-group-trigger" type="button" aria-expanded="false">
                <span>${S.resourceCenter}</span>${I.chevronDown}
              </button>
              <div class="mobile-nav-group-list" hidden>
                ${RC_ITEMS.map(([t, h]) => `<a href="${href(h)}"><span>${t}</span>${I.chevronRight}</a>`).join('')}
              </div>
            </div>
            <div class="mobile-nav-group" data-mobile-nav-group="company">
              <button class="mobile-nav-group-trigger" type="button" aria-expanded="false">
                <span>${S.ourCompany}</span>${I.chevronDown}
              </button>
              <div class="mobile-nav-group-list" hidden>
                ${COMPANY_ITEMS.map(([t, h]) => `<a href="${href(h)}"><span>${t}</span>${I.chevronRight}</a>`).join('')}
              </div>
            </div>
            <div class="mobile-nav-group" data-mobile-nav-group="support">
              <button class="mobile-nav-group-trigger" type="button" aria-expanded="false">
                <span>${S.support}</span>${I.chevronDown}
              </button>
              <div class="mobile-nav-group-list" hidden>
                ${SUPPORT_ITEMS.map(([t, h]) => `<a href="${href(h)}"><span>${t}</span>${I.chevronRight}</a>`).join('')}
              </div>
            </div>
            <a href="${href('/dealer-access')}"><span>${S.dealerLogin}</span>${I.chevronRight}</a>
          </nav>
        </div>
      </div>`;

    /* Globe shows current locale; click switches like storefront / ↔ /fr/.
       checkout.html binds $$('.lang button')[data-lang], so we activate the other button. */
    const langGroup = el.querySelector('.lang');
    if (langGroup) {
      langGroup.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-lang]');
        if (!btn || !langGroup.contains(btn)) return;
        const current = langGroup.querySelector('button.is-active')?.dataset.lang || 'en';
        if (btn.dataset.lang !== current) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const next = current === 'en' ? 'fr' : 'en';
        const other = langGroup.querySelector(`button[data-lang="${next}"]`);
        if (!other) return;
        other.hidden = false;
        other.click();
      }, true);
      /* Pages that change locale themselves (e.g. checkout's province switch) call el.setLocale(code)
         so the globe never disagrees with the page. Keeps is-active and hidden in step. */
      el.setLocale = (next) => {
        langGroup.querySelectorAll('button[data-lang]').forEach((b) => {
          const on = b.dataset.lang === next;
          b.classList.toggle('is-active', on);
          b.hidden = !on;
        });
      };
      langGroup.querySelectorAll('button[data-lang]').forEach((btn) => {
        btn.addEventListener('click', () => el.setLocale(btn.dataset.lang));
      });
    }

    /* Dealer popover: one place closes it so hidden + aria-expanded never drift apart. */
    const closeDealers = () => {
      el.querySelectorAll('.dealer-menu').forEach((m) => { m.hidden = true; });
      el.querySelectorAll('.dealer-current-button').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    };
    el.querySelectorAll('[data-dealer-nav]').forEach((nav) => {
      const trigger = nav.querySelector('.dealer-current-button');
      const menu = nav.querySelector('.dealer-menu');
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = menu.hidden;
        closeDealers();
        menu.hidden = !open;
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
    /* The locale toggle stops propagation, so the document click handler never sees it: close popovers from a parent capture listener. */
    if (langGroup) el.addEventListener('click', (e) => { if (langGroup.contains(e.target)) closeDealers(); }, true);

    const catalog = el.querySelector('[data-catalog]');
    const catalogTrigger = catalog.querySelector('.catalog-nav-trigger');
    const catalogDrop = catalog.querySelector('.catalog-dropdown');
    const setCatalog = (open) => {
      catalogDrop.hidden = !open;
      catalogTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) catalogTrigger.setAttribute('data-state', 'open');
      else catalogTrigger.removeAttribute('data-state');
    };
    catalog.addEventListener('mouseenter', () => setCatalog(true));
    catalog.addEventListener('mouseleave', () => setCatalog(false));
    catalogTrigger.addEventListener('focus', () => setCatalog(true));
    catalog.addEventListener('focusout', (e) => {
      if (!catalog.contains(e.relatedTarget)) setCatalog(false);
    });

    /* Resource Center / Support / Company: same hover/focus as catalog, plus click for
       keyboard/touch. Short mouseleave delay so the pointer can reach the panel. Catalog unchanged. */
    el.querySelectorAll('[data-nav-dropdown]').forEach((group) => {
      const trigger = group.querySelector('.catalog-nav-trigger');
      const drop = group.querySelector('.catalog-dropdown');
      let leaveTimer = 0;
      const setGroup = (open) => {
        drop.hidden = !open;
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) trigger.setAttribute('data-state', 'open');
        else trigger.removeAttribute('data-state');
      };
      group.addEventListener('mouseenter', () => {
        if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = 0; }
        setGroup(true);
      });
      group.addEventListener('mouseleave', () => {
        leaveTimer = setTimeout(() => { leaveTimer = 0; setGroup(false); }, 120);
      });
      trigger.addEventListener('focus', () => setGroup(true));
      group.addEventListener('focusout', (e) => {
        if (!group.contains(e.relatedTarget)) setGroup(false);
      });
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        setGroup(drop.hidden);
      });
    });

    const burger = el.querySelector('.mobile-menu-trigger');
    const panel = el.querySelector('[data-mobile-panel]');
    /* State attribute is data-menu-open (not data-open): account/checkout bind their own [data-open] modal triggers document-wide. */
    const setMobile = (open) => {
      if (panel.hidden === !open) return;
      panel.hidden = !open;
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('data-menu-open', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? S.closeMenu : S.openMenu);
      burger.innerHTML = open ? I.close : I.menu;
    };
    burger.addEventListener('click', (e) => {
      e.stopPropagation();
      setMobile(panel.hidden);
    });
    panel.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMobile(false)));

    document.addEventListener('click', (e) => {
      if (!el.contains(e.target)) {
        setCatalog(false);
        el.querySelectorAll('[data-nav-dropdown] .catalog-dropdown').forEach((d) => { d.hidden = true; });
        el.querySelectorAll('[data-nav-dropdown] .catalog-nav-trigger').forEach((b) => { b.setAttribute('aria-expanded', 'false'); b.removeAttribute('data-state'); });
        closeDealers();
      }
      if (!panel.contains(e.target) && !burger.contains(e.target)) setMobile(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        setCatalog(false);
        el.querySelectorAll('[data-nav-dropdown] .catalog-dropdown').forEach((d) => { d.hidden = true; });
        el.querySelectorAll('[data-nav-dropdown] .catalog-nav-trigger').forEach((b) => { b.setAttribute('aria-expanded', 'false'); b.removeAttribute('data-state'); });
        setMobile(false);
        closeDealers();
      }
    });

    /* Mobile drawer groups (Support / Company): tap the group heading to expand/collapse
       its child links in place, matching the drawer's flat-list rows for everything else. */
    el.querySelectorAll('[data-mobile-nav-group]').forEach((group) => {
      const trigger = group.querySelector('.mobile-nav-group-trigger');
      const list = group.querySelector('.mobile-nav-group-list');
      trigger.addEventListener('click', () => {
        const open = list.hidden;
        list.hidden = !open;
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    /* Same path as account.html #accountSignOut → VSSession.signOut (session.js). Do not reload in place. */
    el.querySelectorAll('[data-sign-out]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (window.VSSession && typeof VSSession.signOut === 'function') {
          VSSession.signOut();
          return;
        }
        fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
          .catch(() => null)
          .finally(() => {
            try { if (window.VSSession) VSSession.set(null); } catch (e) { /* ignore */ }
            const p = location.pathname || '';
            location.href = (p === '/fr' || p.indexOf('/fr/') === 0) ? '/fr/account/login' : '/account/login';
          });
      });
    });

    /* Expose the sticky header's height so pages can offset their own sticky panels (e.g. the cart summary). */
    const publishHeight = () => document.documentElement.style.setProperty('--header-h', el.offsetHeight + 'px');
    publishHeight();
    if ('ResizeObserver' in window) new ResizeObserver(publishHeight).observe(el);
    else window.addEventListener('resize', publishHeight);
      });
  });
})();
