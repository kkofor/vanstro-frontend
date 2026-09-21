/* HTML prototype mount for shadcn/components/layout/SiteFooter.tsx
   Source: vanity-selector-260904 (footer-brand is always shown).
   Styles: assets/storefront-chrome.css
   Usage: <footer class="site-footer" data-site-footer></footer> */
(function () {
  const SITE = 'https://www.vanstro.ca';

  const SOCIAL = [
    { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61591722131934', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 20v-7h2.4l.4-3h-2.8V8.1c0-.9.3-1.5 1.6-1.5h1.4V4c-.7-.1-1.4-.2-2.2-.2-2.8 0-4.4 1.7-4.4 4.1V10H7.5v3h2.4v7h3.6Z"/></svg>' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/138484627/', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.7 9.2H3.8v10.1h2.9V9.2ZM5.2 7.8a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4ZM9.1 9.2h2.8v1.4c.5-.9 1.6-1.6 3.1-1.6 3 0 4.2 1.9 4.2 4.8v5.5h-2.9v-5.1c0-1.7-.6-2.5-1.9-2.5s-2.4 1-2.4 2.7v4.9H9.1V9.2Z"/></svg>' },
    { label: 'Pinterest', href: 'https://www.pinterest.com/VanStro/', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 20V5h5.2c3.1 0 5 1.7 5 4.3s-1.9 4.4-5 4.4h-2.2V20H8Zm3-9.1h2.1c1.4 0 2.2-.6 2.2-1.7s-.8-1.7-2.2-1.7H11v3.4Z"/></svg>' },
    { label: 'YouTube', href: 'https://www.youtube.com/@vanstroglobal', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.6 12 5.6 12 5.6s-5 0-6.9.5A3 3 0 0 0 3 8.2a31.5 31.5 0 0 0-.5 3.8 31.5 31.5 0 0 0 .5 3.8 3 3 0 0 0 2.1 2.1c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.1 31.5 31.5 0 0 0 .5-3.8 31.5 31.5 0 0 0-.5-3.8Z"/><path d="m10.2 15.3 5-3.3-5-3.3v6.6Z" class="social-icon-cutout"/></svg>' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@vanstro_home', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.1 4.2h2.7c.3 2.2 1.6 3.8 3.7 4.1v2.8a7.1 7.1 0 0 1-3.6-1.2v5.4c0 3.1-2.1 5-5.1 5-2.7 0-4.7-1.8-4.7-4.3 0-2.8 2.2-4.5 5.4-4.3v2.9c-1.3-.2-2.3.4-2.3 1.4 0 .8.7 1.4 1.6 1.4 1 0 2.3-.5 2.3-2.4V4.2Z"/></svg>' },
  ];

  const GROUPS = [
    {
      title: 'Shop',
      links: [
        ['Kitchen Cabinets', '/products?category=kitchen-cabinets'],
        ['Bathroom Vanities', '/products?category=bathroom-vanities'],
        ['Baseboards & Mouldings', '/products?category=baseboards'],
        ['Handle Series', '/products?category=handle-series'],
      ],
    },
    {
      title: 'Customer Support',
      links: [
        ['Contact us', '/contact'],
        ['Order tracking', 'order-status.html'], // guest lookup page in this prototype (production: /order-status)
        ['Shipping & delivery', '/guides/pickup-and-delivery-options'],
        ['Returns & exchanges', '/return-policy'],
      ],
    },
    {
      title: 'Dealer Program',
      links: [
        ['Dealer program', '/dealer-program'],
        ['Become a dealer', '/dealers/apply'],
        ['Dealer Portal', '/dealer-access'],
      ],
    },
    {
      title: 'Company',
      links: [
        ['About us', '/about'],
        ['Dealer map', '/dealers/map'],
        ['Download center', '/articles'],
        ['Guides', '/guides'],
        ['Careers', '/careers'],
      ],
    },
  ];

  const LEGAL = [
    ['Legal Disclaimer', '/legal-disclaimer'],
    ['Terms and Conditions', '/terms-and-conditions'],
    ['Privacy Policy', '/privacy'],
    ['Cookie Preferences', '#cookie-preferences'],
    ['Return Policy', '/return-policy'],
    ['VanStro & Local Dealer Responsibilities', '/dealer-services-and-responsibility'],
    ['Careers', '/careers'],
  ];

  const PIN = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
  const MAIL = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';
  const PHONE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.5 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.5-8.6A2 2 0 0 1 3.9 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.6 2.8a2 2 0 0 1-.4 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.8.6A2 2 0 0 1 22 16.9Z"/></svg>';

  function localizeHref(h) {
    if (!h || h.charAt(0) !== '/') return h;
    const p = location.pathname || '';
    const fr = p === '/fr' || p.indexOf('/fr/') === 0;
    if (!fr || h.indexOf('/fr') === 0) return h;
    if (h === '/') return '/fr/';
    return '/fr' + h;
  }
  const href = (h) => {
    if (!h) return h;
    if (h.startsWith('http') || h.startsWith('#') || h.endsWith('.html')) return h;
    return localizeHref(h);
  };
  const group = (g) => `<nav class="footer-group" aria-label="${g.title}">
    <h2>${g.title}</h2>
    ${g.links.map(([t, h]) => `<a class="footer-group-link" href="${href(h)}">${t}</a>`).join('')}
  </nav>`;

  const legal = LEGAL.map(([t, h]) => {
    if (h === '#cookie-preferences') {
      return `<a class="footer-legal-link" href="#cookie-preferences">${t}</a>`;
    }
    return `<a class="footer-legal-link" href="${href(h)}">${t}</a>`;
  }).join('');

  const social = SOCIAL.map((c) => `<a href="${c.href}" target="_blank" rel="noopener noreferrer" aria-label="${c.label}"><span>${c.svg}</span></a>`).join('');

  const html = `
    <div class="container">
      <div class="footer-link-grid">
        <div class="footer-brand">
          <a href="${href('/')}" aria-label="VanStro home">
            <img src="/account/assets/vanstro-logo.png" alt="VanStro Global Supply" width="315" height="63" loading="lazy" decoding="async">
          </a>
          <p>Your global supply platform</p>
          <div class="footer-contact-list" aria-label="Contact information">
            <a class="footer-contact-link" href="https://www.google.com/maps/search/?api=1&query=856+Century+Street+Winnipeg+MB+R3H+0M5" target="_blank" rel="noopener noreferrer">${PIN}856 Century Street, Winnipeg, MB R3H 0M5</a>
            <a class="footer-contact-link" href="mailto:support@vanstro.ca">${MAIL}support@vanstro.ca</a>
            <a class="footer-contact-link" href="tel:+12042212288">${PHONE}204 221 2288</a>
          </div>
          <div class="footer-social" aria-label="Social media channels">
            <div class="social-links">${social}</div>
          </div>
        </div>
        <div class="footer-groups">
          ${GROUPS.map(group).join('')}
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2026 VanStro Global Supply Inc. All rights reserved. | Tous droits réservés.</p>
        <div class="footer-legal">${legal}</div>
      </div>
    </div>`;

  document.querySelectorAll('[data-site-footer]').forEach((el) => { el.innerHTML = html; });
})();
