/* Browser helper for Moneris Hosted Tokenization + the order API.

   The card inputs (number · MM/YY · CVV) are a single small Moneris-hosted iframe dropped into
   our own bordered "card box" and styled with the same CSS as the rest of the form, so the page
   looks and behaves like a native card form. The PAN never enters this page (PCI SAQ A).

   Live path:  GET /api/checkout/payment-config → { ht:{ url, profileId } }
               VSMoneris.htMount(...) → iframe            (customer types card details)
               Pay → htFrame.tokenize() → { dataKey }    (postMessage 'tokenize' → Moneris → temp token)
               POST /api/orders (pending order, server re-prices + quotes tax)
               POST /api/checkout/moneris/pay { orderNo, temporaryToken } → server charges, emails, notifies dealer.
   Mock path:  same API calls; the card box is rendered by VSMoneris.mockMount() and the token is
               mock:<Brand>:<last4> (MONERIS_MOCK=1 on the server).
   Static path (no API, e.g. python http.server): mockMount only; the order is simulated in the page. */
window.VSMoneris = (function () {
  let apiState = null; // null = unknown, false = static server, object = /api/health payload
  async function api() {
    if (apiState !== null) return apiState;
    try {
      const r = await fetch('/api/health', { credentials: 'same-origin' });
      apiState = r.ok ? await r.json() : false;
    } catch { apiState = false; }
    return apiState;
  }
  let cfgState = null;
  async function paymentConfig() {
    if (cfgState) return cfgState;
    const r = await fetch('/api/checkout/payment-config', { credentials: 'same-origin' });
    if (!r.ok) throw new ApiError(r.status, await r.json().catch(() => ({})));
    cfgState = await r.json();
    return cfgState;
  }

  class ApiError extends Error {
    constructor(status, body) { super((body && (body.message || body.error)) || ('HTTP ' + status)); this.status = status; this.body = body || {}; }
  }
  /* orderNo (optional) adds the guest access token header for that order — see assets/session.js. */
  async function post(url, body, orderNo) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, (window.VSSession && VSSession.headers(orderNo)) || {});
    const res = await fetch(url, { method: 'POST', headers, credentials: 'same-origin', body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    // 202 payment_pending is a 2xx but not a receipt: surface it like an error so callers never treat it as paid.
    if (!res.ok || (data && data.ok === false)) throw new ApiError(res.status, data);
    return data;
  }

  /* Creates the pending order server-side and returns { orderNo, guest, accessToken, txnTotalCents, quote, dealer, payment:{ mode, ht } }.
     For guests the accessToken is remembered so every later call about this order carries it. */
  async function createOrder(payload) {
    const r = await post('/api/orders', payload);
    if (r && r.accessToken && window.VSSession) VSSession.setOrderToken(r.orderNo, r.accessToken);
    return r;
  }
  /* Charges the order with the temporary token. Resolves { ok, order, notifications } or throws
     ApiError(402, { code, message }) on decline. */
  function pay(orderNo, opts) { return post('/api/checkout/moneris/pay', Object.assign({ orderNo }, opts), orderNo); }
  function pushPos(orderNo) { return post('/api/orders/' + encodeURIComponent(orderNo) + '/push-pos', {}, orderNo); }
  function resendReceipt(orderNo, opts) { return post('/api/orders/' + encodeURIComponent(orderNo) + '/receipt/resend', opts || {}, orderNo); }
  /* Guest token travels as ?t= so the link also works as a plain <a download>. */
  const invoicePdfUrl = orderNo => {
    const base = '/api/orders/' + encodeURIComponent(orderNo) + '/invoice.pdf';
    const t = window.VSSession && VSSession.orderToken(orderNo);
    return t ? base + '?t=' + encodeURIComponent(t) : base;
  };
  /* Public lookup for guests: order number + the email it was placed with → { order, accessToken }. */
  async function lookupOrder(orderNo, email) {
    const r = await post('/api/orders/lookup', { orderNo, email });
    if (r && r.accessToken && window.VSSession) VSSession.setOrderToken(r.order.orderNo, r.accessToken);
    return r;
  }
  /* Attaches guest orders whose access tokens we already hold (proof the caller saw the receipt). */
  function claimOrders() {
    const tokens = (window.VSSession && VSSession.allOrderTokens && VSSession.allOrderTokens()) || {};
    return post('/api/orders/claim', { tokens });
  }
  /* GET one order (owner session or remembered guest token). */
  async function getOrder(orderNo) {
    const t = window.VSSession && VSSession.orderToken(orderNo);
    const url = '/api/orders/' + encodeURIComponent(orderNo) + (t ? '?t=' + encodeURIComponent(t) : '');
    const res = await fetch(url, { credentials: 'same-origin', headers: (window.VSSession && VSSession.headers(orderNo)) || {} });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data);
    return data.order;
  }

  /* ------------------------------------------------------------------
     Hosted Tokenization frame. Moneris only lets us style the inputs via query-string CSS, so the
     values below mirror assets/vi.css (.control input) — keep them in sync by hand. */
  const HT_FONT = '"HarmonyOS Sans","Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
  function htParams(profileId, o) {
    const p = new URLSearchParams();
    p.set('id', profileId);
    p.set('pmmsg', 'true');
    p.set('css_body', 'margin:0;padding:0;background:transparent;font-family:' + HT_FONT + ';');
    p.set('css_textbox', 'box-sizing:border-box;float:left;height:44px;border:0;outline:0;background:transparent;margin:0;padding:0 14px;font-family:' + HT_FONT + ';font-size:15px;color:' + (o.color || '#0a1614') + ';');
    p.set('css_textbox_pan', 'width:52%;');
    p.set('enable_exp', '1'); p.set('css_textbox_exp', 'width:26%;padding-left:8px;');
    p.set('enable_cvd', '1'); p.set('css_textbox_cvd', 'width:22%;padding-left:8px;');
    p.set('display_labels', '2'); // placeholder labels — the visible label is ours, outside the frame
    p.set('pan_label', o.panLabel || 'Card number'); p.set('exp_label', o.expLabel || 'MM / YY'); p.set('cvd_label', o.cvdLabel || 'CVV');
    p.set('enable_cc_formatting', '1'); p.set('enable_exp_formatting', '1');
    return p.toString();
  }
  /* Moneris HT response codes (see docs). 943/944/945 are per-field validation errors. */
  const HT_ERRORS = {
    '940': 'Payment form could not start (profile). Please refresh.',
    '941': 'Could not secure your card details. Please try again.',
    '942': 'Payment form is not allowed on this page (origin). Please refresh.',
    '943': 'Check the card number.',
    '944': 'Check the expiry date (MM / YY).',
    '945': 'Check the security code.',
  };
  function htMount({ divId, url, profileId, labels = {}, color, onLoaded }) {
    const host = document.getElementById(divId);
    if (!host) throw new Error('htMount: missing #' + divId);
    const origin = new URL(url).origin;
    let frame; let pending = null;
    function build() {
      host.innerHTML = '';
      frame = document.createElement('iframe');
      frame.title = 'Card number, expiry and security code (secured by Moneris)';
      frame.setAttribute('frameborder', '0'); frame.setAttribute('scrolling', 'no');
      frame.allow = 'payment';
      frame.style.cssText = 'display:block;width:100%;height:44px;border:0;background:transparent;';
      frame.src = url + '?' + htParams(profileId, Object.assign({ color }, labels));
      frame.addEventListener('load', () => onLoaded && onLoaded(), { once: true });
      host.appendChild(frame);
    }
    function onMessage(e) {
      if (e.origin !== origin || !pending) return;
      let d; try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
      if (!d || typeof d.responseCode === 'undefined') return;
      const p = pending; pending = null; clearTimeout(p.timer);
      const codes = Array.isArray(d.responseCode) ? d.responseCode : [String(d.responseCode)];
      if (codes.includes('001') && d.dataKey) { p.resolve({ dataKey: d.dataKey, bin: d.bin || '' }); return; }
      const bad = codes.filter(c => c !== '001');
      p.reject(Object.assign(new Error(bad.map(c => HT_ERRORS[c] || d.errorMessage || ('Card error ' + c)).join(' ')), { codes: bad, fields: bad.map(c => ({ '943': 'pan', '944': 'exp', '945': 'cvd' })[c]).filter(Boolean) }));
    }
    window.addEventListener('message', onMessage);
    build();
    return {
      kind: 'ht',
      /* Asks Moneris to tokenize what the customer typed. Resolves { dataKey, bin } or rejects with
         { codes, fields } so the page can point at the offending field. */
      tokenize() {
        return new Promise((resolve, reject) => {
          if (pending) return reject(new Error('Tokenization already in progress'));
          pending = { resolve, reject, timer: setTimeout(() => { if (pending) { pending = null; reject(new Error('The payment form did not respond. Please try again.')); } }, 15000) };
          frame.contentWindow.postMessage('tokenize', origin);
        });
      },
      /* Temporary tokens and HT tickets are single use → reload the frame before another attempt. */
      reset() { build(); },
      focus() { try { frame.focus(); } catch {} },
      element: () => frame,
      destroy() { window.removeEventListener('message', onMessage); host.innerHTML = ''; },
    };
  }

  /* ------------------------------------------------------------------
     Prototype stand-in for the HT frame: the same single-row card box, rendered by us. Simulates
     issuer outcomes by test PAN (server-side in mock mode, page-side when there is no API):
       4242 4242 4242 4242  approved
       4000 0000 0000 3220  3-D Secure challenge → approved
       4000 0000 0000 0002  declined (076 · insufficient funds)
       4000 0000 0000 0069  declined (051 · expired card)
       4000 0000 0000 0502  provider down (502) — retry the same token, do not open a new order
     Card data never leaves the mock frame object; the "token" only carries brand + last4. */
  const TEST_CARDS = {
    '4242424242424242': { result: 'a', brand: 'Visa' },
    '4000000000003220': { result: 'a', brand: 'Visa', challenge: true },
    '4000000000000002': { result: 'd', brand: 'Visa', code: '076', messageEn: 'Declined: insufficient funds', messageFr: 'Refusée : fonds insuffisants' },
    '4000000000000069': { result: 'd', brand: 'Visa', code: '051', messageEn: 'Declined: card expired', messageFr: 'Refusée : carte expirée' },
    '4000000000000502': { result: 'a', brand: 'Visa' },
  };
  function brandOf(pan) {
    if (/^4/.test(pan)) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(pan)) return 'Mastercard';
    if (/^3[47]/.test(pan)) return 'Amex';
    return 'Unknown';
  }
  function luhn(pan) {
    let s = 0, alt = false;
    for (let i = pan.length - 1; i >= 0; i--) { let n = +pan[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; }
    return pan.length >= 13 && s % 10 === 0;
  }
  function mockMount({ divId, labels = {}, onLoaded, onBrand }) {
    const host = document.getElementById(divId);
    if (!host) throw new Error('mockMount: missing #' + divId);
    host.innerHTML = `<div class="card-row" data-mock-card>
        <input data-mco-pan inputmode="numeric" autocomplete="cc-number" placeholder="${labels.panLabel || 'Card number'}" maxlength="19" spellcheck="false" aria-label="Card number">
        <input data-mco-exp inputmode="numeric" autocomplete="cc-exp" placeholder="${labels.expLabel || 'MM / YY'}" maxlength="7" aria-label="Expiry date">
        <input data-mco-cvv inputmode="numeric" autocomplete="cc-csc" placeholder="${labels.cvdLabel || 'CVV'}" maxlength="4" aria-label="Security code">
      </div>`;
    const q = s => host.querySelector(s);
    const pan = q('[data-mco-pan]'), exp = q('[data-mco-exp]'), cvv = q('[data-mco-cvv]');
    pan.addEventListener('input', () => {
      const d = pan.value.replace(/\D/g, '').slice(0, 16);
      pan.value = d.replace(/(\d{4})(?=\d)/g, '$1 ');
      const b = brandOf(d); cvv.maxLength = b === 'Amex' ? 4 : 3;
      onBrand && onBrand(d.length >= 2 && b !== 'Unknown' ? b : '');
    });
    exp.addEventListener('input', () => { const d = exp.value.replace(/\D/g, '').slice(0, 4); exp.value = d.length > 2 ? d.slice(0, 2) + ' / ' + d.slice(2) : d; });
    cvv.addEventListener('input', () => { cvv.value = cvv.value.replace(/\D/g, ''); });
    function validate() {
      const d = pan.value.replace(/\D/g, ''); const fields = [], msgs = [];
      if (!luhn(d)) { fields.push('pan'); msgs.push(HT_ERRORS['943']); }
      const m = exp.value.replace(/\D/g, ''); const mm = +m.slice(0, 2), yy = 2000 + +m.slice(2, 4); const now = new Date();
      const expOk = m.length === 4 && mm >= 1 && mm <= 12 && (yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1));
      if (!expOk) { fields.push('exp'); msgs.push(HT_ERRORS['944']); }
      if (cvv.value.length < (brandOf(d) === 'Amex' ? 4 : 3)) { fields.push('cvd'); msgs.push(HT_ERRORS['945']); }
      return { ok: !fields.length, fields, message: msgs.join(' ') };
    }
    setTimeout(() => onLoaded && onLoaded(), 150);
    return {
      kind: 'mock',
      /* Same contract as htMount().tokenize(): resolves { dataKey, bin, test } where dataKey is mock:<Brand>:<last4>. */
      async tokenize() {
        const v = validate();
        if (!v.ok) throw Object.assign(new Error(v.message), { codes: [], fields: v.fields });
        await wait(500);
        const d = pan.value.replace(/\D/g, '');
        const t = TEST_CARDS[d] || { result: 'a', brand: brandOf(d) };
        return { dataKey: 'mock:' + t.brand + ':' + d.slice(-4), bin: d.slice(0, 6), test: Object.assign({ last4: d.slice(-4) }, t) };
      },
      prefill(v) { pan.value = v.pan || ''; pan.dispatchEvent(new Event('input')); exp.value = v.exp || ''; exp.dispatchEvent(new Event('input')); cvv.value = v.cvv || ''; },
      reset() { cvv.value = ''; },
      focus() { pan.focus(); },
      element: () => host.firstElementChild,
      destroy() { host.innerHTML = ''; },
    };
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  return { TEST_CARDS, HT_ERRORS, api, paymentConfig, ApiError, createOrder, pay, pushPos, resendReceipt, invoicePdfUrl, lookupOrder, claimOrders, getOrder, htMount, mockMount, brandOf, luhn };
})();
